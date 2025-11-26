import { useState } from "react";
import {
  Lock,
  Unlock,
  Key,
  AlertCircle,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";

export default function EncodeDecode() {
  const [activeTab, setActiveTab] = useState("decrypt");

  // --- Shared State ---
  // Default key (32 chars) to match AES-256 requirement
  const [secretKey, setSecretKey] = useState(
    "myverystrongpasswordo32bitlength"
  );
  const [showKey, setShowKey] = useState(false);

  // --- Decrypt State ---
  const [encryptedInput, setEncryptedInput] = useState("");
  const [decryptedResult, setDecryptedResult] = useState<any>(null);
  const [decryptError, setDecryptError] = useState<string>("");

  // --- Encrypt State (Simulator) ---
  const [jsonInput, setJsonInput] = useState(
    '{\n  "id": 123,\n  "role": "admin",\n  "credit_card": "4111-xxxx-xxxx-1111"\n}'
  );
  const [generatedCiphertext, setGeneratedCiphertext] = useState("");
  const [encryptError, setEncryptError] = useState<string>("");

  // ---------------------------------------------------------------------------
  // CRYPTO LOGIC (Matches Go's cipher.NewGCM)
  // ---------------------------------------------------------------------------

  const getCryptoKey = async (rawKeyStr: string) => {
    const enc = new TextEncoder();
    return await window.crypto.subtle.importKey(
      "raw",
      enc.encode(rawKeyStr),
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"]
    );
  };

  const decryptData = async () => {
    setDecryptError("");
    setDecryptedResult(null);

    try {
      if (secretKey.length !== 32)
        throw new Error(
          "Key must be exactly 32 bytes (32 characters) for AES-256."
        );
      if (!encryptedInput) throw new Error("Please enter an encrypted string.");

      // 1. Decode Base64 to raw bytes
      const binaryString = atob(encryptedInput);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // 2. Extract Nonce (Standard Go GCM uses 12 bytes nonce at the start)
      const nonce = bytes.slice(0, 12);
      const ciphertext = bytes.slice(12);

      // 3. Decrypt
      const key = await getCryptoKey(secretKey);
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: nonce },
        key,
        ciphertext
      );

      // 4. Decode to String and JSON
      const dec = new TextDecoder();
      const decodedString = dec.decode(decryptedBuffer);

      try {
        const json = JSON.parse(decodedString);
        setDecryptedResult(json);
      } catch (e) {
        // If it's just a string, not JSON
        setDecryptedResult(decodedString);
      }
    } catch (err: any) {
      console.error(err);
      setDecryptError(
        err.message || "Decryption failed. Check your key and input."
      );
    }
  };

  const encryptData = async () => {
    setEncryptError("");
    setGeneratedCiphertext("");

    try {
      if (secretKey.length !== 32)
        throw new Error("Key must be exactly 32 bytes for AES-256.");

      // 1. Prepare Data
      const enc = new TextEncoder();
      const dataBuffer = enc.encode(jsonInput); // Input is already a string (JSON)

      // 2. Generate Random Nonce (12 bytes)
      const nonce = window.crypto.getRandomValues(new Uint8Array(12));

      // 3. Encrypt
      const key = await getCryptoKey(secretKey);
      const encryptedBuffer = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: nonce },
        key,
        dataBuffer
      );

      // 4. Combine Nonce + Ciphertext (Go style: Seal appends result to nonce)
      const combined = new Uint8Array(
        nonce.length + encryptedBuffer.byteLength
      );
      combined.set(nonce);
      combined.set(new Uint8Array(encryptedBuffer), nonce.length);

      // 5. Convert to Base64
      let binary = "";
      for (let i = 0; i < combined.byteLength; i++) {
        binary += String.fromCharCode(combined[i]);
      }
      const base64 = btoa(binary);

      setGeneratedCiphertext(base64);
    } catch (err: any) {
      setEncryptError(err.message);
    }
  };

  // ---------------------------------------------------------------------------
  // UI COMPONENTS
  // ---------------------------------------------------------------------------

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-8 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-600 dark:bg-indigo-700 rounded-2xl shadow-lg mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-200">
            Secure Payload Decoder
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Client-side implementation of Go's{" "}
            <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded text-sm">
              aes-256-gcm
            </code>
          </p>
        </header>

        {/* Secret Key Input (Global) */}
        <div className="bg-white dark:bg-slate-700 rounded-xl shadow-sm border border-slate-200 p-6 mb-6 dark:border-slate-600">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2">
            <Key className="w-4 h-4 text-indigo-500 dark:text-indigo-200" />
            Shared Secret Key (32 Bytes)
          </label>
          <div className="relative dark:bg-slate-700">
            <input
              type={showKey ? "text" : "password"}
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono text-sm"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-200 transition-colors"
            >
              {showKey ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2 dark:text-slate-200">
            Must match the backend key exactly. Current length:{" "}
            <span
              className={
                secretKey.length === 32
                  ? "text-green-600 dark:text-green-200 font-bold"
                  : "text-red-500 dark:text-red-200 font-bold"
              }
            >
              {secretKey.length}
            </span>{" "}
            chars.
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-700 rounded-xl shadow-xl border border-slate-200 dark:border-slate-600 overflow-hidden">
          <div className="flex border-b border-slate-100 dark:border-slate-600">
            <button
              onClick={() => setActiveTab("decrypt")}
              className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                activeTab === "decrypt"
                  ? "bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600 dark:bg-indigo-600 dark:text-indigo-200"
                  : "text-slate-500 dark:text-slate-200 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              <Unlock className="w-4 h-4" />
              Client: Decrypt Response
            </button>
            <button
              onClick={() => setActiveTab("encrypt")}
              className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                activeTab === "encrypt"
                  ? "bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600 dark:bg-indigo-600 dark:text-indigo-200"
                  : "text-slate-500 dark:text-slate-200 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              <Lock className="w-4 h-4" />
              Simulator: Generate Encrypted Data
            </button>
          </div>

          <div className="p-6 md:p-8">
            {activeTab === "decrypt" ? (
              // --- DECRYPT VIEW ---
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                    Encrypted Base64 String
                  </label>
                  <textarea
                    value={encryptedInput}
                    onChange={(e) => setEncryptedInput(e.target.value)}
                    placeholder="Paste the base64 string from your API response here..."
                    className="w-full h-32 p-4 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-xs resize-y"
                  />
                </div>

                <button
                  onClick={decryptData}
                  className="w-full py-3 bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-700 dark:hover:bg-indigo-800 text-white dark:text-indigo-200 rounded-lg font-medium shadow-md shadow-indigo-200 dark:shadow-indigo-600 transition-all flex items-center justify-center gap-2"
                >
                  <Unlock className="w-4 h-4" />
                  Decrypt Payload
                </button>

                {decryptError && (
                  <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 dark:text-red-200" />
                    <div className="text-sm">{decryptError}</div>
                  </div>
                )}

                {decryptedResult && (
                  <div className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-200 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Decrypted Successfully
                      </h3>
                      <span className="text-xs text-slate-400 dark:text-slate-200">
                        JSON Object
                      </span>
                    </div>
                    <div className="bg-slate-900 dark:bg-slate-700 rounded-lg p-4 overflow-x-auto relative group">
                      <button
                        onClick={() =>
                          copyToClipboard(
                            JSON.stringify(decryptedResult, null, 2)
                          )
                        }
                        className="absolute top-3 right-3 p-2 bg-slate-800 dark:bg-slate-700 text-slate-400 dark:text-slate-200 rounded hover:text-white hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-all"
                        title="Copy JSON"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <pre className="text-emerald-400 dark:text-emerald-200 font-mono text-sm leading-relaxed">
                        {JSON.stringify(decryptedResult, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // --- ENCRYPT VIEW (SIMULATOR) ---
              <div className="space-y-6">
                <div className="bg-amber-50 dark:bg-amber-700 border border-amber-200 dark:border-amber-600 rounded-lg p-4 text-sm text-amber-800 dark:text-amber-200 mb-4">
                  <strong>Simulator Mode:</strong> Use this to generate strings
                  that look exactly like what your Go backend would produce.
                  Copy the result into the "Decrypt" tab to test the cycle.
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                    Raw JSON Data (To be hidden)
                  </label>
                  <textarea
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    className="w-full h-32 p-4 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-xs resize-y"
                  />
                </div>

                <button
                  onClick={encryptData}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  Encrypt Data
                </button>

                {encryptError && (
                  <div className="p-4 bg-red-50 dark:bg-red-700 text-red-700 dark:text-red-200 rounded-lg border border-red-200 dark:border-red-600 text-sm">
                    {encryptError}
                  </div>
                )}

                {generatedCiphertext && (
                  <div className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                      Generated Ciphertext (Base64)
                    </label>
                    <div className="relative group">
                      <textarea
                        readOnly
                        value={generatedCiphertext}
                        className="w-full h-24 p-4 pr-12 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg font-mono text-xs text-slate-600 dark:text-slate-200 outline-none resize-none"
                      />
                      <button
                        onClick={() => copyToClipboard(generatedCiphertext)}
                        className="absolute top-2 right-2 p-2 bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-200 rounded-md shadow-sm border border-slate-200 dark:border-slate-600 hover:text-indigo-600 hover:border-indigo-300 transition-all"
                        title="Copy to clipboard"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="mt-2 text-right">
                      <button
                        onClick={() => {
                          setEncryptedInput(generatedCiphertext);
                          setActiveTab("decrypt");
                          setDecryptedResult(null);
                        }}
                        className="text-sm text-indigo-600 dark:text-indigo-200 hover:text-indigo-800 dark:hover:text-indigo-200 font-medium inline-flex items-center gap-1"
                      >
                        Test in Decrypt Tab &rarr;
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
