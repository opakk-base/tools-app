import { BrowserRouter as Router, Routes, Route } from "react-router";
import { ScrollToTop } from "./components/common/ScrollToTop";
import AppLayout from "./layout/AppLayout";
import Home from "./pages/dashboard/Home";
import EncodeDecode from "./pages/encode/Index";
import GenerateCertificate from "./pages/certificate/Index";
import AboutMeRedirect from "./pages/about/Index";
import ImageResize from "./pages/image-resize/Index";
import PDFMerge from "./pages/pdf-merge/Index";
import PDFCompress from "./pages/pdf-compress/Index";
import PDFSplit from "./pages/pdf-split/Index";
import PDFEditor from "./pages/pdf-editor/Index";
import PDFEmbed from "./pages/pdf-embed/Index";
import PDFEnhance from "./pages/pdf-enhance/Index";

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
            <Route path="/about-me" element={<AboutMeRedirect />} />
            <Route path="/image-resize" element={<ImageResize />} />
            <Route path="/pdf-merge" element={<PDFMerge />} />
            <Route path="/pdf-split" element={<PDFSplit />} />
            <Route path="/pdf-compress" element={<PDFCompress />} />
            <Route path="/pdf-editor" element={<PDFEditor />} />
            <Route path="/pdf-embed" element={<PDFEmbed />} />
            <Route path="/pdf-enhance" element={<PDFEnhance />} />
          </Route>
        </Routes>
      </Router>
    </>
  );
}
