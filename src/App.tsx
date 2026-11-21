import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Navigate, Route, Routes } from "react-router-dom";
import { TopBar } from "./components/TopBar";
import { Landing } from "./pages/Landing";
import { Play } from "./pages/Play";
import { Final } from "./pages/Final";
import { WalletPage } from "./pages/WalletPage";

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28 }}
    >
      {children}
    </motion.div>
  );
}

export default function App() {
  const location = useLocation();
  return (
    <MotionConfig reducedMotion="user">
      <ScrollTop />
      <div className="relative min-h-dvh bg-ink-950">
        <TopBar />
        <AnimatePresence mode="wait" initial={false}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Page><Landing /></Page>} />
            <Route path="/play" element={<Page><Play /></Page>} />
            <Route path="/final" element={<Page><Final /></Page>} />
            <Route path="/wallet" element={<Page><WalletPage /></Page>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
