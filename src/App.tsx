import { BrowserRouter as Router, Routes, Route } from "react-router";
import { ScrollToTop } from "./components/common/ScrollToTop";
import AppLayout from "./layout/AppLayout";
import Home from "./pages/dashboard/Home";
import EncodeDecode from "./pages/encode/Index";
import GenerateCertificate from "./pages/certificate/Index";

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
            <Route
              path="/generate-certificate"
              element={<GenerateCertificate />}
            />
          </Route>
        </Routes>
      </Router>
    </>
  );
}
