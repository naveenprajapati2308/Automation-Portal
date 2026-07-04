import './loader.css';
import appLogo from '../../assets/MPHIDB_Logo2.png';

/**
 * Inline loader for panels/sections: <Loader label="Loading reports..." />
 */
export function Loader({ size = 40, label }) {
  return (
    <div className="tx-loader-inline" role="status" aria-live="polite">
      <span className="tx-orbit" style={{ width: size, height: size }}>
        <span className="tx-ring tx-ring-a" />
        <span className="tx-ring tx-ring-b" />
        <span className="tx-core" />
      </span>
      {label && <span>{label}</span>}
    </div>
  );
}

/**
 * Full-screen branded loader shown while the portal boots its data.
 * Pass exiting=true to play the fade-out before unmounting.
 */
export function FullScreenLoader({ exiting = false, subtitle = 'Loading TESTRIX' }) {
  return (
    <div className={`tx-loader-overlay${exiting ? ' tx-exit' : ''}`}>
      <div className="tx-loader-stage">
        <div className="tx-orbit tx-orbit-lg">
          <span className="tx-ring tx-ring-a" />
          <span className="tx-ring tx-ring-b" />
          <span className="tx-ring tx-ring-c" />
          <img src={appLogo} alt="" className="tx-loader-logo" />
        </div>
        <div className="tx-loader-title">TESTRIX</div>
        <div className="tx-loader-subtitle">{subtitle}</div>
        <div className="tx-progressbar"><span /></div>
      </div>
    </div>
  );
}
