import { BrowserRouter as Router, Routes, Route } from "react-router";
import { ScrollToTop } from "./components/common/ScrollToTop";
import AppLayout from "./layout/AppLayout";
import Home from "./pages/dashboard/Home";
import EncodeDecode from "./pages/encode/Index";
import CertificateGenerator from "./pages/certificate/Index";

export default function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Dashboard Layout */}
          <Route element={<AppLayout />}>
            <Route index path="/" element={<Home />} />

            {/* Others Page */}
            <Route path="/encode-decode" element={<EncodeDecode />} />
            
            {/* Certificate Generator */}
            <Route path="/certificate" element={<CertificateGenerator />} />
          </Route>
        </Routes>
      </Router>
    </>
  );
}
