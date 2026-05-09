import { useId } from "react";

export default function CustomSelect({
  options = [],
  value,
  onChange,
  placeholder = "Select…",
  disabled = false,
  ariaLabel,
}) {
  const id = useId();

  return (
    <div className={`csWrap ${disabled ? "isDisabled" : ""}`}>
      <select
        id={id}
        className="csSelect"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        aria-label={ariaLabel}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((opt) => {
          const o = typeof opt === "string" ? { value: opt, label: opt } : opt;
          return (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          );
        })}
      </select>
      <span className="csArrow" aria-hidden="true" />

      <style>{`
        .csWrap{ position: relative; width: 100%; }
        .csSelect{
          width: 100%;
          height: 44px;
          padding: 0 44px 0 14px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.14);
          background: #0f0f0f;
          color: rgba(255,255,255,.92);
          outline: none;
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          transition: border-color .14s ease, box-shadow .14s ease, transform .08s ease;
        }
        .csSelect:hover{ border-color: rgba(255,200,80,.28); }
        .csSelect:focus{
          border-color: rgba(255,200,80,.70);
          box-shadow: 0 0 0 4px rgba(255,200,80,.14);
        }
        .csWrap.isDisabled .csSelect{
          opacity: .6;
          cursor: not-allowed;
        }
        .csArrow{
          position: absolute;
          right: 14px;
          top: 50%;
          width: 10px;
          height: 10px;
          border-right: 2px solid rgba(255,200,80,.95);
          border-bottom: 2px solid rgba(255,200,80,.95);
          transform: translateY(-60%) rotate(45deg);
          pointer-events: none;
          filter: drop-shadow(0 0 10px rgba(255,200,80,.25));
        }
      `}</style>
    </div>
  );
}

