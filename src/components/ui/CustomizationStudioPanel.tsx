import {
  Blocks,
  Gauge,
  Globe,
  Paintbrush,
  Sparkles,
  Trees,
  Wrench,
} from 'lucide-react';
import {
  CAR_ACCESSORIES,
  CAR_SKINS,
  CAR_TUNING_PRESETS,
  CREATIVE_BUNDLES,
  CUSTOM_PAINT_SWATCHES,
  ENVIRONMENT_THEMES,
  useCustomization,
} from '../../config/customization.config';

interface CustomizationStudioPanelProps {
  compact?: boolean;
}

/**
 * Interactive Car & 3D World Customization Studio Panel.
 * Allows switching between Wooden Car, LEGO Brick Car, Origami Cardboard,
 * Cyberpunk Holo-Grid, Translucent Gummy, 24K Gold Chrome, custom paint swatches,
 * roof accessories (spinning clockwork wind-up key, LEGO studs, paper wings),
 * and 6 full 3D Environment Themes.
 */
export function CustomizationStudioPanel({
  compact = false,
}: CustomizationStudioPanelProps) {
  const {
    customization,
    skinSpec,
    themeSpec,
    effectivePhysics,
    setCarSkin,
    setCustomColor,
    setAccessory,
    setTuningPreset,
    setApplyToTraffic,
    setEnvironmentTheme,
    applyBundle,
  } = useCustomization();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? '14px' : '18px',
        padding: compact ? '16px' : '22px',
        borderRadius: '18px',
        background:
          'linear-gradient(155deg, rgba(15, 23, 42, 0.94), rgba(9, 13, 24, 0.96))',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        boxShadow: '0 18px 45px rgba(2, 6, 23, 0.55)',
      }}
    >
      {/* Header & Active Status */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.73rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#38bdf8',
              marginBottom: '4px',
            }}
          >
            <Sparkles size={14} aria-hidden="true" />
            <span>Creative 3D Workshop — Car &amp; World Customizer</span>
          </div>
          <h3
            style={{
              margin: 0,
              fontSize: compact ? '1.05rem' : '1.22rem',
              fontWeight: 800,
              color: '#f8fafc',
            }}
          >
            Wooden Craft, LEGO® Bricks, Origami, Cyberpunk &amp; More
          </h3>
        </div>

        {/* Active Summary Pill */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span
            style={{
              padding: '5px 11px',
              borderRadius: '999px',
              fontSize: '0.76rem',
              fontWeight: 700,
              background: 'rgba(56, 189, 248, 0.14)',
              border: '1px solid rgba(56, 189, 248, 0.38)',
              color: '#bae6fd',
            }}
          >
            Car: {skinSpec.name}
          </span>
          <span
            style={{
              padding: '5px 11px',
              borderRadius: '999px',
              fontSize: '0.76rem',
              fontWeight: 700,
              background: 'rgba(16, 185, 129, 0.14)',
              border: '1px solid rgba(16, 185, 129, 0.38)',
              color: '#a7f3d0',
            }}
          >
            World: {themeSpec.name}
          </span>
        </div>
      </div>

      {/* 1. One-Click Creative Theme Bundles */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.78rem',
            fontWeight: 700,
            color: '#cbd5e1',
            marginBottom: '8px',
          }}
        >
          <Blocks size={14} color="#38bdf8" aria-hidden="true" />
          <span>1-Click Creative Combo Presets (Car + World Together):</span>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
            gap: '8px',
          }}
        >
          {CREATIVE_BUNDLES.map((bundle) => {
            const isActive =
              customization.car.skinId === bundle.skinId &&
              customization.environmentId === bundle.environmentId;
            return (
              <button
                key={bundle.id}
                type="button"
                onClick={() => applyBundle(bundle)}
                style={{
                  cursor: 'pointer',
                  textAlign: 'left',
                  padding: '9px 11px',
                  borderRadius: '11px',
                  border: isActive
                    ? '1.5px solid #38bdf8'
                    : '1px solid rgba(148, 163, 184, 0.2)',
                  background: isActive
                    ? 'rgba(56, 189, 248, 0.16)'
                    : 'rgba(15, 23, 42, 0.72)',
                  color: '#f8fafc',
                  transition: 'all 0.16s ease',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '4px',
                    marginBottom: '3px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: isActive ? '#38bdf8' : '#94a3b8',
                    }}
                  >
                    {bundle.badge}
                  </span>
                  {isActive && (
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '999px',
                        background: '#38bdf8',
                      }}
                    />
                  )}
                </div>
                <div
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#f8fafc',
                  }}
                >
                  {bundle.name}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Two-Column Selector: Left = Car Craft Skin, Right = 3D Environment World */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: '16px',
        }}
      >
        {/* 2. Car Craft / Material Skin Selector */}
        <div
          style={{
            padding: '14px',
            borderRadius: '14px',
            background: 'rgba(2, 6, 23, 0.5)',
            border: '1px solid rgba(148, 163, 184, 0.16)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#f8fafc',
              }}
            >
              <Paintbrush size={15} color="#38bdf8" aria-hidden="true" />
              <span>3D Car Craft &amp; Material Skin</span>
            </div>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.73rem',
                color: '#94a3b8',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={customization.car.applyToTraffic}
                onChange={(e) => setApplyToTraffic(e.target.checked)}
              />
              <span>Apply to Parked Cars</span>
            </label>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '7px',
            }}
          >
            {CAR_SKINS.map((skin) => {
              const selected = customization.car.skinId === skin.id;
              return (
                <button
                  key={skin.id}
                  type="button"
                  onClick={() => setCarSkin(skin.id)}
                  style={{
                    cursor: 'pointer',
                    textAlign: 'left',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    border: selected
                      ? '1.5px solid #38bdf8'
                      : '1px solid rgba(148, 163, 184, 0.18)',
                    background: selected
                      ? 'rgba(56, 189, 248, 0.16)'
                      : 'rgba(15, 23, 42, 0.78)',
                    color: '#f8fafc',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '3px',
                    }}
                  >
                    <span
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '4px',
                        background: skin.primaryColor,
                        border: `2px solid ${skin.secondaryColor}`,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: '0.66rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: selected ? '#38bdf8' : '#94a3b8',
                      }}
                    >
                      {skin.badge}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.79rem', fontWeight: 700 }}>
                    {skin.name}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Paint Swatches & Roof Topper Row */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              paddingTop: '6px',
              borderTop: '1px solid rgba(148, 163, 184, 0.14)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '6px',
              }}
            >
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  color: '#94a3b8',
                }}
              >
                Paint Tint Override:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {CUSTOM_PAINT_SWATCHES.map((swatch) => {
                  const active = customization.car.customColor === swatch.hex;
                  return (
                    <button
                      key={swatch.id}
                      type="button"
                      title={swatch.label}
                      onClick={() => setCustomColor(swatch.hex)}
                      style={{
                        cursor: 'pointer',
                        width: swatch.hex === 'default' ? 'auto' : '22px',
                        height: '22px',
                        padding: swatch.hex === 'default' ? '0 7px' : 0,
                        borderRadius: '999px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        color: '#f8fafc',
                        background:
                          swatch.hex === 'default'
                            ? 'rgba(51, 65, 85, 0.9)'
                            : swatch.hex,
                        border: active
                          ? '2px solid #38bdf8'
                          : '1px solid rgba(255,255,255,0.28)',
                      }}
                    >
                      {swatch.hex === 'default' ? 'Auto' : ''}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3D Roof Topper / Accessory */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '6px',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  color: '#94a3b8',
                }}
              >
                <Wrench size={12} aria-hidden="true" />
                <span>3D Roof Topper:</span>
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {CAR_ACCESSORIES.map((acc) => {
                  const active = customization.car.accessoryId === acc.id;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => setAccessory(acc.id)}
                      style={{
                        cursor: 'pointer',
                        padding: '3px 8px',
                        borderRadius: '7px',
                        fontSize: '0.71rem',
                        fontWeight: 600,
                        border: active
                          ? '1px solid #38bdf8'
                          : '1px solid rgba(148, 163, 184, 0.22)',
                        background: active
                          ? 'rgba(56, 189, 248, 0.2)'
                          : 'rgba(15, 23, 42, 0.8)',
                        color: active ? '#e0f2fe' : '#cbd5e1',
                      }}
                    >
                      {acc.badge}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Real-World Physics & Crash Tuning for Any Customized Car */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                paddingTop: '6px',
                borderTop: '1px solid rgba(148, 163, 184, 0.14)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '6px',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    color: '#38bdf8',
                  }}
                >
                  <Gauge size={13} aria-hidden="true" />
                  <span>Real Physics &amp; Crash Setup:</span>
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {CAR_TUNING_PRESETS.map((preset) => {
                    const active =
                      (customization.car.tuningPreset ?? 'authentic') ===
                      preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setTuningPreset(preset.id)}
                        style={{
                          cursor: 'pointer',
                          padding: '3px 8px',
                          borderRadius: '7px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          border: active
                            ? '1px solid #38bdf8'
                            : '1px solid rgba(148, 163, 184, 0.22)',
                          background: active
                            ? 'rgba(56, 189, 248, 0.22)'
                            : 'rgba(15, 23, 42, 0.8)',
                          color: active ? '#e0f2fe' : '#cbd5e1',
                        }}
                      >
                        {preset.badge}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Physics Multipliers Pill Row */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '5px',
                  fontSize: '0.68rem',
                  color: '#cbd5e1',
                }}
              >
                <span
                  style={{
                    padding: '2px 7px',
                    borderRadius: '6px',
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '1px solid rgba(148, 163, 184, 0.18)',
                  }}
                >
                  Mass: <strong>{Math.round(effectivePhysics.massMultiplier * 100)}%</strong>
                </span>
                <span
                  style={{
                    padding: '2px 7px',
                    borderRadius: '6px',
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '1px solid rgba(148, 163, 184, 0.18)',
                  }}
                >
                  Accel: <strong>{Math.round(effectivePhysics.accelerationMultiplier * 100)}%</strong>
                </span>
                <span
                  style={{
                    padding: '2px 7px',
                    borderRadius: '6px',
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '1px solid rgba(148, 163, 184, 0.18)',
                  }}
                >
                  Grip: <strong>{Math.round(effectivePhysics.gripMultiplier * 100)}%</strong>
                </span>
                <span
                  style={{
                    padding: '2px 7px',
                    borderRadius: '6px',
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '1px solid rgba(148, 163, 184, 0.18)',
                  }}
                >
                  Crash Bounce: <strong>{Math.round(effectivePhysics.restitutionMultiplier * 100)}%</strong>
                </span>
                <span
                  style={{
                    padding: '2px 7px',
                    borderRadius: '6px',
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '1px solid rgba(148, 163, 184, 0.18)',
                  }}
                >
                  Durability: <strong>{Math.round(effectivePhysics.durabilityMultiplier * 100)}%</strong>
                </span>
              </div>
              <div
                style={{
                  fontSize: '0.71rem',
                  color: '#94a3b8',
                  lineHeight: 1.35,
                }}
              >
                {skinSpec.physics.physicsSummary}
              </div>
            </div>
          </div>
        </div>

        {/* 3. 3D Environment World Theme Selector */}
        <div
          style={{
            padding: '14px',
            borderRadius: '14px',
            background: 'rgba(2, 6, 23, 0.5)',
            border: '1px solid rgba(148, 163, 184, 0.16)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#f8fafc',
              }}
            >
              <Globe size={15} color="#10b981" aria-hidden="true" />
              <span>3D Environment &amp; World Theme</span>
            </div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.72rem',
                color: '#94a3b8',
              }}
            >
              <Trees size={13} aria-hidden="true" />
              <span>Full 3D Props &amp; Sky</span>
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
              gap: '7px',
            }}
          >
            {ENVIRONMENT_THEMES.map((theme) => {
              const selected = customization.environmentId === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setEnvironmentTheme(theme.id)}
                  style={{
                    cursor: 'pointer',
                    textAlign: 'left',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    border: selected
                      ? '1.5px solid #10b981'
                      : '1px solid rgba(148, 163, 184, 0.18)',
                    background: selected
                      ? 'rgba(16, 185, 129, 0.16)'
                      : 'rgba(15, 23, 42, 0.78)',
                    color: '#f8fafc',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '3px',
                    }}
                  >
                    <span
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '4px',
                        background: theme.skyColor,
                        border: `2px solid ${theme.asphaltColor}`,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: '0.66rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: selected ? '#34d399' : '#94a3b8',
                      }}
                    >
                      {theme.badge}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.79rem', fontWeight: 700 }}>
                    {theme.name}
                  </div>
                </button>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 'auto',
              padding: '8px 10px',
              borderRadius: '9px',
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(148, 163, 184, 0.14)',
              fontSize: '0.75rem',
              color: '#94a3b8',
              lineHeight: 1.4,
            }}
          >
            <strong style={{ color: '#e2e8f0' }}>{themeSpec.name}:</strong>{' '}
            {themeSpec.shortDesc}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomizationStudioPanel;
