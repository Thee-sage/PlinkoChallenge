import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { GamePage } from "./pages/Gamepage/Gamepage";
import VerifyEmail from './VerifyEmail';
import AdminPanel from './admin/admin';
import PlinkoLandingPage from "./pages/mainpage/mainpage";
import Loginpage from "./smallpages/completesignuppage";
import Layout from './Navbar/layout';
import AdminUpgradeForm from "./adminupgrade/adminupgrade";
import { WalletProvider } from "./contexts/Walletcontext";
import { AuthProvider } from "./contexts/authcontext";
import Abc from "./accountmangement/accountmangement";
import AuthContainer from "./smallpages/completesignuppage";
import { useEffect, ReactNode } from 'react';
import { AdminAuthProvider } from "./contexts/admincontext";
import { ThemeProvider } from './contexts/ThemeContext';
import { PublicCasinoList, PublicCasinoDetail } from "./pages/casinolist/allcasinopage";
import { loadNunito } from './fonts';
import { PrivacyPolicy } from "./pages/policy/policy";
import { Footer } from "./Footer/Footer";

interface PageWrapperProps {
  children: ReactNode;
}

const PageWrapper: React.FC<PageWrapperProps> = ({ children }) => {
  const location = useLocation();
  const shouldShowFooter = ['/game', '/casinos', '/', '/privacy-policy'].includes(location.pathname) || 
                        location.pathname.startsWith('/casinos/');

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-grow">
        {children}
      </div>
      {shouldShowFooter && <Footer />}
    </div>
  );
};

function App() {
  useEffect(() => {
    loadNunito();
  }, []);

  return (
    <div className="font-nunito">
      <ThemeProvider>
        <BrowserRouter>
          <WalletProvider>
            <AuthProvider>
              <AdminAuthProvider>
                <Routes>
                  <Route element={<Layout />}>
                    <Route path="/" element={<PageWrapper><PlinkoLandingPage /></PageWrapper>} />
                    <Route path="/game" element={<PageWrapper><GamePage /></PageWrapper>} />
                    <Route path="/verify-email" element={<VerifyEmail />} />
                    <Route path="/complete" element={<Loginpage />} />
                    <Route path="/abc/*" element={<Abc />} />
                    <Route path="/casinos" element={<PageWrapper><PublicCasinoList /></PageWrapper>} />
                    <Route path="/casinos/:id" element={<PageWrapper><PublicCasinoDetail /></PageWrapper>} />
                    <Route path="/auth/*" element={<AuthContainer />} />
                    <Route path="/privacy-policy" element={<PageWrapper><PrivacyPolicy /></PageWrapper>} />
                  </Route>
                  <Route path="/admin/*" element={<AdminPanel />} />
                  <Route path="/adminlogin" element={<AdminUpgradeForm />} />
                </Routes>
              </AdminAuthProvider>
            </AuthProvider>
          </WalletProvider>
        </BrowserRouter>
      </ThemeProvider>
    </div>
  );
}
export default App;  
