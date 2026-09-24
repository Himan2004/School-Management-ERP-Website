import React, { useState, useEffect } from "react";
import {
  HeartPulse,
  User,
  Droplets,
  Ruler,
  Weight,
  Activity,
  AlertCircle,
  Pill,
  Syringe,
  ClipboardList,
  Calendar,
  FileText,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { getStudentHealthApi } from "../../services/api/parentHealthApi";

export default function ParentHealth() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedVisit, setExpandedVisit] = useState(null);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getStudentHealthApi();
      if (response?.success) {
        setHealthData(response.data);
      } else {
        setError(response?.message || "Failed to fetch health data");
      }
    } catch (err) {
      setError(err?.message || "Failed to fetch student health data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // ---------- LOADING STATE ----------
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2
            className="w-10 h-10 animate-spin"
            style={{ color: "#6366f1" }}
          />
          <span
            className="text-lg font-semibold animate-pulse"
            style={{ color: "#6366f1" }}
          >
            Loading health records…
          </span>
        </div>
      </div>
    );
  }

  // ---------- ERROR STATE ----------
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "1rem",
            padding: "2rem 2.5rem",
            textAlign: "center",
            maxWidth: 420,
          }}
        >
          <AlertCircle
            className="mx-auto mb-3"
            style={{ color: "#ef4444", width: 40, height: 40 }}
          />
          <p
            className="font-semibold text-lg mb-2"
            style={{ color: "#b91c1c" }}
          >
            Unable to Load Health Records
          </p>
          <p className="mb-5" style={{ color: "#6b7280", fontSize: 14 }}>
            {error}
          </p>
          <button
            onClick={fetchHealth}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 24px",
              background: "#ef4444",
              color: "#fff",
              border: "none",
              borderRadius: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 14,
              transition: "background 0.2s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "#dc2626")}
            onMouseOut={(e) => (e.currentTarget.style.background = "#ef4444")}
          >
            <RefreshCw style={{ width: 16, height: 16 }} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ---------- EMPTY STATE ----------
  if (!healthData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div style={{ textAlign: "center" }}>
          <HeartPulse
            className="mx-auto mb-3"
            style={{ color: "#d1d5db", width: 48, height: 48 }}
          />
          <p className="font-semibold text-lg" style={{ color: "#6b7280" }}>
            No Health Records Found
          </p>
          <p style={{ color: "#9ca3af", fontSize: 14, marginTop: 4 }}>
            Health records will appear here once they are updated by the school.
          </p>
        </div>
      </div>
    );
  }

  const { studentInfo, profile, health, visits } = healthData;

  // ---------- MAIN RENDER ----------
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      {/* ── HEADER ─────────────────────────────────── */}
      <div
        style={{
          background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
          borderRadius: "1.5rem",
          padding: "2rem",
          color: "#fff",
          marginBottom: 24,
          boxShadow: "0 10px 25px -5px rgba(99,102,241,0.3)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "1rem",
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(255,255,255,0.3)",
              }}
            >
              <HeartPulse style={{ width: 36, height: 36 }} />
            </div>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>
                Health Records
              </h1>
              <p
                style={{
                  marginTop: 4,
                  fontSize: 15,
                  opacity: 0.85,
                }}
              >
                {studentInfo?.name
                  ? `${studentInfo.name}'s health profile`
                  : "Student health profile & medical history"}
              </p>
              {studentInfo && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    marginTop: 10,
                  }}
                >
                  {studentInfo.class && (
                    <span
                      style={{
                        padding: "4px 14px",
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.2)",
                        fontSize: 13,
                      }}
                    >
                      Class {studentInfo.class}
                      {studentInfo.section ? ` - ${studentInfo.section}` : ""}
                    </span>
                  )}
                  {studentInfo.rollNo && (
                    <span
                      style={{
                        padding: "4px 14px",
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.2)",
                        fontSize: 13,
                      }}
                    >
                      Roll #{studentInfo.rollNo}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={fetchHealth}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              background: "#fff",
              color: "#6366f1",
              border: "none",
              borderRadius: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 14,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#eef2ff";
              e.currentTarget.style.transform = "scale(1.03)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "#fff";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <RefreshCw style={{ width: 16, height: 16 }} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── HEALTH PROFILE CARDS ──────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Blood Group */}
        <ProfileCard
          icon={<Droplets style={{ color: "#ef4444" }} />}
          label="Blood Group"
          value={profile?.bloodGroup || healthData?.bloodGroup || "Not Recorded"}
          bg="#fef2f2"
          border="#fecaca"
        />
        {/* Height */}
        <ProfileCard
          icon={<Ruler style={{ color: "#6366f1" }} />}
          label="Height"
          value={profile?.height ? `${profile.height} cm` : "Not Recorded"}
          bg="#eef2ff"
          border="#c7d2fe"
        />
        {/* Weight */}
        <ProfileCard
          icon={<Weight style={{ color: "#f59e0b" }} />}
          label="Weight"
          value={profile?.weight ? `${profile.weight} kg` : "Not Recorded"}
          bg="#fffbeb"
          border="#fde68a"
        />
        {/* BMI */}
        <ProfileCard
          icon={<Activity style={{ color: "#10b981" }} />}
          label="BMI"
          value={profile?.bmi || "Not Calculated"}
          bg="#ecfdf5"
          border="#a7f3d0"
        />
        {/* Last Checkup */}
        <ProfileCard
          icon={<Stethoscope style={{ color: "#8b5cf6" }} />}
          label="Last Checkup"
          value={formatDate(profile?.lastCheckup)}
          bg="#f5f3ff"
          border="#ddd6fe"
        />
      </div>

      {/* ── CONDITIONS & MEDICATIONS ROW ──────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Allergies */}
        <ListCard
          icon={<AlertCircle style={{ color: "#ef4444", width: 20, height: 20 }} />}
          title="Allergies"
          items={profile?.allergies}
          emptyText="No known allergies"
          tagColor="#fef2f2"
          tagBorder="#fecaca"
          tagText="#b91c1c"
        />
        {/* Chronic Conditions */}
        <ListCard
          icon={<ShieldCheck style={{ color: "#f59e0b", width: 20, height: 20 }} />}
          title="Chronic Conditions"
          items={profile?.chronicConditions}
          emptyText="No chronic conditions recorded"
          tagColor="#fffbeb"
          tagBorder="#fde68a"
          tagText="#92400e"
        />
        {/* Vaccinations */}
        <ListCard
          icon={<Syringe style={{ color: "#10b981", width: 20, height: 20 }} />}
          title="Vaccinations"
          items={profile?.vaccinations}
          emptyText="No vaccination records"
          tagColor="#ecfdf5"
          tagBorder="#a7f3d0"
          tagText="#065f46"
        />
        {/* Current Medications */}
        <ListCard
          icon={<Pill style={{ color: "#6366f1", width: 20, height: 20 }} />}
          title="Current Medications"
          items={profile?.medications}
          emptyText="No active medications"
          tagColor="#eef2ff"
          tagBorder="#c7d2fe"
          tagText="#3730a3"
        />
      </div>

      {/* ── HEALTH NOTES ─────────────────────────── */}
      {health?.notes && (
        <div
          style={{
            background: "#f5f3ff",
            border: "1px solid #ddd6fe",
            borderRadius: "1rem",
            padding: "1.25rem 1.5rem",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <FileText style={{ color: "#7c3aed", width: 20, height: 20 }} />
            <h2 style={{ fontWeight: 700, fontSize: 17, margin: 0 }}>
              Health Notes
            </h2>
          </div>
          <p style={{ color: "#4b5563", lineHeight: 1.6, margin: 0 }}>
            {health.notes}
          </p>
        </div>
      )}

      {/* ── MEDICAL VISITS HISTORY ────────────────── */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: "1rem",
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid #f3f4f6",
          }}
        >
          <ClipboardList style={{ color: "#6366f1", width: 22, height: 22 }} />
          <h2 style={{ fontWeight: 700, fontSize: 18, margin: 0 }}>
            Medical Visits History
          </h2>
          <span
            style={{
              marginLeft: "auto",
              fontSize: 13,
              color: "#9ca3af",
              fontWeight: 500,
            }}
          >
            {visits?.length || 0} visit{visits?.length !== 1 ? "s" : ""}
          </span>
        </div>

        {!visits || visits.length === 0 ? (
          <div
            style={{
              padding: "3rem",
              textAlign: "center",
              color: "#9ca3af",
            }}
          >
            <Calendar
              className="mx-auto mb-2"
              style={{ width: 36, height: 36, color: "#d1d5db" }}
            />
            <p style={{ fontWeight: 500 }}>No medical visits recorded yet</p>
          </div>
        ) : (
          <div style={{ padding: "0.5rem 1rem 1rem" }}>
            {visits.map((visit, idx) => {
              const isExpanded = expandedVisit === idx;
              return (
                <div
                  key={visit.id || idx}
                  style={{
                    border: "1px solid #f3f4f6",
                    borderRadius: "0.75rem",
                    marginTop: idx === 0 ? 8 : 10,
                    overflow: "hidden",
                    transition: "box-shadow 0.2s",
                    boxShadow: isExpanded
                      ? "0 2px 8px rgba(99,102,241,0.1)"
                      : "none",
                  }}
                >
                  <button
                    onClick={() =>
                      setExpandedVisit(isExpanded ? null : idx)
                    }
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 16px",
                      background: isExpanded ? "#f5f3ff" : "#fafafa",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background 0.2s",
                    }}
                    onMouseOver={(e) => {
                      if (!isExpanded)
                        e.currentTarget.style.background = "#f9fafb";
                    }}
                    onMouseOut={(e) => {
                      if (!isExpanded)
                        e.currentTarget.style.background = "#fafafa";
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: visit.followUpRequired
                            ? "#f59e0b"
                            : "#10b981",
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: 14,
                            color: "#1f2937",
                          }}
                        >
                          {visit.reason || "Medical Visit"}
                        </span>
                        <span
                          style={{
                            display: "block",
                            fontSize: 12,
                            color: "#9ca3af",
                            marginTop: 2,
                          }}
                        >
                          {formatDate(visit.date)}
                        </span>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp
                        style={{ width: 18, height: 18, color: "#6366f1" }}
                      />
                    ) : (
                      <ChevronDown
                        style={{ width: 18, height: 18, color: "#9ca3af" }}
                      />
                    )}
                  </button>

                  {isExpanded && (
                    <div style={{ padding: "16px 20px", background: "#fff" }}>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fill, minmax(200px, 1fr))",
                          gap: 14,
                        }}
                      >
                        <DetailItem
                          label="Diagnosis / Notes"
                          value={visit.diagnosis}
                        />
                        <DetailItem
                          label="Action Taken"
                          value={visit.actionTaken}
                        />
                        <DetailItem
                          label="Attended By"
                          value={visit.nurseName}
                        />
                        <DetailItem
                          label="Follow-up Required"
                          value={
                            visit.followUpRequired
                              ? `Yes — ${formatDate(visit.followUpDate)}`
                              : "No"
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── CHECKUP HISTORY ───────────────────────── */}
      {health?.checkupHistory?.length > 0 && (
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "1rem",
            marginTop: 24,
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "1.25rem 1.5rem",
              borderBottom: "1px solid #f3f4f6",
            }}
          >
            <Stethoscope
              style={{ color: "#10b981", width: 22, height: 22 }}
            />
            <h2 style={{ fontWeight: 700, fontSize: 18, margin: 0 }}>
              Checkup History
            </h2>
          </div>

          <div style={{ padding: "1rem 1.5rem" }}>
            {health.checkupHistory.map((checkup, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "12px 0",
                  borderBottom:
                    idx < health.checkupHistory.length - 1
                      ? "1px solid #f3f4f6"
                      : "none",
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: "#10b981",
                    marginTop: 6,
                    flexShrink: 0,
                  }}
                />
                <div>
                  <p
                    style={{
                      fontWeight: 600,
                      fontSize: 14,
                      color: "#1f2937",
                      margin: 0,
                    }}
                  >
                    {checkup.type || checkup.reason || "Health Checkup"}
                  </p>
                  <p
                    style={{
                      fontSize: 13,
                      color: "#6b7280",
                      margin: "2px 0 0",
                    }}
                  >
                    {formatDate(checkup.date)}
                    {checkup.notes ? ` — ${checkup.notes}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── LAST UPDATED FOOTER ───────────────────── */}
      <div
        style={{
          textAlign: "center",
          marginTop: 24,
          paddingBottom: 16,
          fontSize: 13,
          color: "#9ca3af",
        }}
      >
        Last updated: {formatDate(profile?.lastCheckup) || "N/A"}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════ */

function ProfileCard({ icon, label, value, bg, border }) {
  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: "1rem",
        padding: "1.25rem",
        transition: "box-shadow 0.2s, transform 0.2s",
        cursor: "default",
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.06)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        {icon}
        <span style={{ fontSize: 13, fontWeight: 500, color: "#6b7280" }}>
          {label}
        </span>
      </div>
      <p
        style={{
          fontWeight: 700,
          fontSize: 20,
          margin: 0,
          color: "#1f2937",
        }}
      >
        {value}
      </p>
    </div>
  );
}

function ListCard({
  icon,
  title,
  items,
  emptyText,
  tagColor,
  tagBorder,
  tagText,
}) {
  const hasItems = items && items.length > 0;
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: "1rem",
        padding: "1.25rem 1.5rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
        }}
      >
        {icon}
        <h3 style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>{title}</h3>
      </div>
      {hasItems ? (
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
        >
          {items.map((item, i) => (
            <span
              key={i}
              style={{
                padding: "5px 14px",
                borderRadius: 999,
                background: tagColor,
                border: `1px solid ${tagBorder}`,
                fontSize: 13,
                color: tagText,
                fontWeight: 500,
              }}
            >
              {typeof item === "string" ? item : item?.name || item?.label || JSON.stringify(item)}
            </span>
          ))}
        </div>
      ) : (
        <p style={{ color: "#9ca3af", fontSize: 14, margin: 0 }}>
          {emptyText}
        </p>
      )}
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div>
      <span
        style={{
          fontSize: 12,
          color: "#9ca3af",
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </span>
      <p
        style={{
          fontWeight: 500,
          fontSize: 14,
          color: "#374151",
          margin: "4px 0 0",
        }}
      >
        {value || "N/A"}
      </p>
    </div>
  );
}
