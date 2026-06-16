import { useEffect, useMemo, useState } from "react";
import defaultConfig from "./config/academicConfig.json";
import instiLogo from "./assets/insti_logo.svg";
import Uploader from "./components/Uploader";
import StudentTable from "./components/StudentTable";

function AppHeader() {
  const dateStr = useMemo(() => {
    const d = new Date();
    const mon = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
    return `${d.getDate()} ${mon} ${d.getFullYear()}`;
  }, []);

  return (
    <header className="fusion-header">
      <div className="fh-left">
        <img src={instiLogo} alt="IIITDM Jabalpur" className="fh-logo" />
        <div className="fh-insti">
          <div className="fh-insti-hi">
            <sup>पी.डी.पी.एम.</sup> भारतीय सूचना प्रौद्योगिकी अभिकल्पन एवं विनिर्माण संस्थान जबलपुर
          </div>
          <div className="fh-insti-en">
            Indian Institute of Information Technology, Design and Manufacturing Jabalpur
          </div>
        </div>
        <div className="fh-brand">
          <div className="fh-brand-top">
            PDPM IIITDM <span className="fh-accent">JABALPUR</span>
          </div>
          <div className="fh-brand-sub">FUSION GRADE SHEET</div>
        </div>
      </div>
      <div className="fh-date">{dateStr}</div>
    </header>
  );
}

export default function App() {
  const [config, setConfig] = useState(defaultConfig);
  const [parsed, setParsed] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [historyByRoll, setHistoryByRoll] = useState({});

  useEffect(() => {
    let active = true;
    window.api
      ?.loadConfig()
      .then((saved) => {
        if (active && saved) setConfig({ ...defaultConfig, ...saved });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <AppHeader />
      <div className="app-shell">
        <Uploader
          config={config}
          onReset={() => {
            setParsed(null);
            setMetadata(null);
            setHistoryByRoll({});
          }}
          onLoaded={(p, m, history) => {
            setParsed(p);
            setMetadata(m);
            setHistoryByRoll(history || {});
          }}
        />
        {parsed && metadata && (
          <StudentTable parsed={parsed} metadata={metadata} historyByRoll={historyByRoll} />
        )}
      </div>
    </div>
  );
}
