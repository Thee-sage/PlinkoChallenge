import React, { useState } from 'react';
import { Routes, Route, useNavigate, Link, useLocation } from "react-router-dom";
import { Label } from '../compo/ui/label';
import { cn } from '../compo/lib/utils';
import { Input } from '../compo/ui/input';
import { useAuth } from "../contexts/authcontext";
import ForgotPassword from '../forgotpassword';
import { baseURL } from '../utils';
import styles from './page.module.css';
import logo from "../assets/logo.svg";

const AuthContainer = () => {
  const location = useLocation();
  const isLoginRoute = location.pathname === '/auth/login';

  return (
    <div className={styles.pageContainer}>
      <div className={styles.backgroundOverlay} />
      
      <div className={styles.contentContainer}>
        <div className={styles.formContainer}>
          <div className={styles.logo}>
            <img src={logo} alt="Logo" className={styles.logoImage} />
          </div>

          <h2 className={styles.header}>
            {isLoginRoute ? 'Welcome back' : 'Join us'}
          </h2>
          <p className={styles.subheader}>
            {isLoginRoute 
              ? "Sign in to your account to continue"
              : "Create an account to get started"
            }
          </p>

          <Routes>
            <Route path="login" element={<LoginForm />} />
            <Route path="signup" element={<SignupForm />} />
          </Routes>

          <div className={styles.divider}>
            <div className={styles.dividerLine} />
            <div className={styles.dividerText}>
              or continue with
            </div>
          </div>

          <div>
            <div>
              
            </div>
          </div>
          <p className={styles.footerText}>
            {isLoginRoute ? "Don't have an account?" : 'Already have an account?'}
            <Link 
              to={isLoginRoute ? '/auth/signup' : '/auth/login'} 
              className={styles.footerLink}
            >
              {isLoginRoute ? 'Sign Up' : 'Login'}
            </Link>
          </p>
          {isLoginRoute && <ForgotPassword />}
        </div>
      </div>
    </div>
  );
};

const LoginForm = () => {
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginSuccess, setLoginSuccess] = useState('');
  const navigate = useNavigate();
  const { loginWithEmailAndPassword } = useAuth();

  const handleLoginEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginEmail) {
      setStep('password');
      setLoginError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginWithEmailAndPassword(loginEmail, loginPassword);
      setLoginSuccess('Login successful! Redirecting...');
      setLoginError('');
      navigate('/game');
    } catch (error: any) {
      setLoginError(error.message || 'Invalid login credentials');
    }
  };

  return (
    <form className={styles.form} onSubmit={step === 'email' ? handleLoginEmailSubmit : handleSubmit}>
      {step === 'email' ? (
        <LabelInputContainer>
          <Label htmlFor="email" className={styles.label}>Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            required
            className={styles.input}
          />
        </LabelInputContainer>
      ) : (
        <LabelInputContainer>
          <Label htmlFor="password" className={styles.label}>Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            required
            className={styles.input}
          />
        </LabelInputContainer>
      )}

      <button
        className={cn(styles.submitButton, styles.buttonGradient)}
        type="submit"
      >
        {step === 'email' ? 'Continue' : 'Login'} →
        <BottomGradient />
      </button>

      {loginError && <p className={styles.errorText}>{loginError}</p>}
      {loginSuccess && <p className={styles.successText}>{loginSuccess}</p>}
    </form>
  );
};

const SignupForm = () => {
  const [signupFirstName, setSignupFirstName] = useState('');
  const [signupLastName, setSignupLastName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupError, setSignupError] = useState('');
  const [signupSuccess, setSignupSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [signupStage, setSignupStage] = useState<'initial' | 'creating' | 'verifying'>('initial');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLoading) return;
    
    setIsLoading(true);
    setSignupError('');
    setSignupStage('creating');
    
    try {
      const response = await fetch(`${baseURL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: signupFirstName,
          lastName: signupLastName,
          email: signupEmail,
          password: signupPassword
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSignupStage('verifying');
        setSignupSuccess(
          `Account created successfully! We've sent a verification link to ${signupEmail}. Please check your inbox and spam folder.`
        );
        setSignupFirstName('');
        setSignupLastName('');
        setSignupEmail('');
        setSignupPassword('');
        setTimeout(() => navigate('/auth/login'), 5000); // Give more time to read the message
      } else {
        setSignupError(data.message || 'Sign-up failed. Please try again.');
        setSignupStage('initial');
      }
    } catch (err: any) {
      setSignupError(err.message || 'An error occurred. Please try again.');
      setSignupStage('initial');
    } finally {
      setIsLoading(false);
    }
  };

  const getLoadingMessage = () => {
    switch (signupStage) {
      case 'creating':
        return 'Creating your account...';
      case 'verifying':
        return 'Sending verification email...';
      default:
        return '';
    }
  };

  const getButtonText = () => {
    switch (signupStage) {
      case 'creating':
        return 'Creating account...';
      case 'verifying':
        return 'Sending verification...';
      default:
        return 'Sign up →';
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.nameGridContainer}>
        <LabelInputContainer>
          <Label htmlFor="firstname" className={styles.label}>First name</Label>
          <Input
            id="firstname"
            type="text"
            placeholder="John"
            value={signupFirstName}
            onChange={(e) => setSignupFirstName(e.target.value)}
            required
            disabled={isLoading}
            className={styles.input}
          />
        </LabelInputContainer>
        <LabelInputContainer>
          <Label htmlFor="lastname" className={styles.label}>Last name</Label>
          <Input
            id="lastname"
            type="text"
            placeholder="Doe"
            value={signupLastName}
            onChange={(e) => setSignupLastName(e.target.value)}
            required
            disabled={isLoading}
            className={styles.input}
          />
        </LabelInputContainer>
      </div>

      <LabelInputContainer>
        <Label htmlFor="email" className={styles.label}>Email Address</Label>
        <Input
          id="email"
          type="email"
          placeholder="name@example.com"
          value={signupEmail}
          onChange={(e) => setSignupEmail(e.target.value)}
          required
          disabled={isLoading}
          className={styles.input}
        />
      </LabelInputContainer>

      <LabelInputContainer>
        <Label htmlFor="password" className={styles.label}>Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={signupPassword}
          onChange={(e) => setSignupPassword(e.target.value)}
          required
          disabled={isLoading}
          className={styles.input}
        />
      </LabelInputContainer>

      <button
        className={cn(
          styles.submitButton, 
          styles.buttonGradient,
          isLoading && styles.buttonLoading
        )}
        type="submit"
        disabled={isLoading}
      >
        {getButtonText()}
        {!isLoading && <BottomGradient />}
      </button>

      {signupError && (
        <p className={styles.errorText}>{signupError}</p>
      )}
      
      {signupSuccess && (
        <div className={styles.successContainer}>
          <p className={styles.successText}>{signupSuccess}</p>
          <p className={styles.successSubtext}>
            You'll be redirected to the login page once you verify your email.
          </p>
        </div>
      )}
      
      {isLoading && !signupError && !signupSuccess && (
        <p className={styles.loadingMessage}>
          {getLoadingMessage()}
        </p>
      )}
    </form>
  );
};

const BottomGradient = () => {
  return (
    <>
      <span className={cn(styles.bottomGradient, styles.bottomGradientBase)} />
      <span className={cn(styles.bottomGradientBlur, styles.bottomGradientBlurBase)} />
    </>
  );
};

const LabelInputContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn(styles.labelInputContainer, className)}>
      {children}
    </div>
  );
};

export default AuthContainer;