import { useEffect, useRef, useState } from 'react';
import { BallManager } from '../../game/classes/BallManager';
import axios from 'axios';
import { baseURL } from '../../utils';
import styles from './Demo.module.css'; // Changed from Demo.module.css to Game.module.css
import { io, Socket } from 'socket.io-client';
import Zixoslogo from "../../assets/zixos";

interface GameStatus {
  currentBalance: number;
  maxBallPrice: number;
}

interface GameResult {
  multiplier: number;
  winnings: number;
}

export function Demo() {
  const [ballManager, setBallManager] = useState<BallManager | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus | null>(null);
  const [gameResult, setGameResult] = useState<GameResult>({ multiplier: 0, winnings: 0 });
  const [ballPrice, setBallPrice] = useState<number>(1);
  const [showMaxPriceAlert, setShowMaxPriceAlert] = useState<boolean>(false);
  const [showInsufficientBalance, setShowInsufficientBalance] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [initialBalance, setInitialBalance] = useState<number | null>(null);

  const ZixosWithTooltip = () => (
    <div className={styles.tooltipContainer}>
      <Zixoslogo />
      <span className={styles.tooltip}>
        Zixos is an in-game currency with no real-world value
      </span>
    </div>
  );

  const fetchGameStatus = async (socketId: string) => {
    try {
      const response = await axios.get(`${baseURL}/demo-status/sampleUserId?socketId=${socketId}`);
      setGameStatus(response.data);
      if (initialBalance === null) {
        setInitialBalance(response.data.currentBalance);
      }
      if (response.data.maxBallPrice < ballPrice) {
        setBallPrice(response.data.maxBallPrice);
      }
    } catch (error) {
      console.error('Error fetching game status:', error);
    }
  };

  useEffect(() => {
    const newSocket = io(baseURL);
    setSocket(newSocket);

    if (canvasRef.current) {
      const manager = new BallManager(canvasRef.current);
      setBallManager(manager);
    }

    newSocket.on('connect', () => {
      if (newSocket.id) {
        fetchGameStatus(newSocket.id);
      }
    });

    newSocket.on('demo_game_result', (data) => {
      setGameStatus(prev => ({
        ...prev!,
        currentBalance: data.currentBalance
      }));

      // Update game result with multiplier and winnings
      setGameResult({
        multiplier: data.multiplier || 0,
        winnings: data.winnings || 0
      });
    });

    return () => {
      newSocket.close();
      if (ballManager) {
        ballManager.stop();
      }
    };
  }, []);

  const handlePriceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    const newPrice = parseInt(value);
    
    if (isNaN(newPrice) || newPrice < 1) {
      setBallPrice(1);
      return;
    }

    // First check max price
    if (gameStatus && newPrice > gameStatus.maxBallPrice) {
      setBallPrice(gameStatus.maxBallPrice);
      setShowMaxPriceAlert(true);
      setTimeout(() => setShowMaxPriceAlert(false), 3000);
      return;
    }

    // Then check if they have enough balance
    if (gameStatus && newPrice > gameStatus.currentBalance) {
      setBallPrice(newPrice); // Still set the price but show warning
      setShowInsufficientBalance(true);
      setTimeout(() => setShowInsufficientBalance(false), 3000);
    } else {
      setBallPrice(newPrice);
    }
  };

  const addBallHandler = async () => {
    if (!socket?.id || !gameStatus) return;

    // Check for max price
    if (ballPrice > gameStatus.maxBallPrice) {
      setShowMaxPriceAlert(true);
      setTimeout(() => setShowMaxPriceAlert(false), 3000);
      return;
    }

    // Check for insufficient balance
    if (gameStatus.currentBalance < ballPrice) {
      setShowInsufficientBalance(true);
      setTimeout(() => setShowInsufficientBalance(false), 3000);
      return;
    }

    try {
      const response = await axios.post(`${baseURL}/demo-game`, {
        userId: 'sampleUserId',
        ballPrice,
        socketId: socket.id
      });

      if (ballManager) {
        ballManager.addBall(response.data.point);
      }
    } catch (error) {
      console.error('Error in adding ball:', error);
    }
  };

  return (
    <div>
      <div className={styles.gameContainer}>
        <div className={styles.innerContainer}>
          <div className={styles.demoMessage}>
            Playing with temporary demo Zixos. Sign up to play with permanent balance!
          </div>
          
          <div className={styles.gameContent}>
            <div className={styles.canvasContainer}>
              <canvas
                ref={canvasRef}
                className={styles.canvas}
              />
            </div>
            
            <div className={styles.controlsPanel}>
              <div className={styles.inputGroup}>
                <label htmlFor="ballPrice" className={styles.label}>
                  Set Ball Price:
                </label>
                <div className={styles.inputWrapper}>
                  <input
                    id="ballPrice"
                    type="number"
                    value={ballPrice}
                    onChange={handlePriceChange}
                    className={styles.input}
                    min="1"
                    max={gameStatus?.maxBallPrice}
                  />
                  <span className={styles.inputValue}>
                    <ZixosWithTooltip />
                  </span>
                </div>
              </div>
              
              <button
                onClick={addBallHandler}
                className={`${styles.button} ${
                  !gameStatus || (gameStatus && gameStatus.currentBalance < ballPrice) 
                    ? styles.buttonDisabled 
                    : ''
                }`}
                disabled={!gameStatus || (gameStatus && gameStatus.currentBalance < ballPrice)}
              >
                Drop Ball
              </button>
              
              <div className={styles.resultsContainer}>
                <h3 className={styles.resultsTitle}>Game Results</h3>
                
                <div className={styles.resultItem}>
                  <span>Demo Balance:</span>
                  <span className={styles.resultValue}>
                    {gameStatus ? Number(gameStatus.currentBalance).toFixed(2) : "0.00"} <ZixosWithTooltip />
                  </span>
                </div>
                
                <div className={styles.resultItem}>
                  <span>Ball Price:</span>
                  <span className={styles.resultValue}>
                    {Number(ballPrice).toFixed(2)} <ZixosWithTooltip />
                  </span>
                </div>
                
                <div className={styles.resultItem}>
                  <span>Winnings:</span>
                  <span className={styles.resultValue}>
                    {Number(gameResult.winnings).toFixed(2)} <ZixosWithTooltip />
                  </span>
                </div>
                
                <div className={styles.resultItem}>
                  <span>Multiplier:</span>
                  <span className={styles.resultValue}>
                    {Number(gameResult.multiplier).toFixed(2)}x
                  </span>
                </div>
                
                <div className={styles.resultItem}>
                  <span>Max Price:</span>
                  <span className={styles.resultValue}>
                    {gameStatus ? Number(gameStatus.maxBallPrice).toFixed(2) : "0.00"} <ZixosWithTooltip />
                  </span>
                </div>
              </div>

              {showMaxPriceAlert && (
                <div className={styles.errorMessage}>
                  Maximum ball price is {gameStatus ? Number(gameStatus.maxBallPrice).toFixed(2) : "0.00"} Zixos!
                </div>
              )}

              {showInsufficientBalance && (
                <div className={styles.errorMessage}>
                  Not enough Zixos! You need {Number(ballPrice).toFixed(2)} Zixos but only have {gameStatus ? Number(gameStatus.currentBalance).toFixed(2) : "0.00"} Zixos.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}