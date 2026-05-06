import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const ADMIN_USER = "CooAdmin";
const ADMIN_PASS = "Server2245Coo";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nowAfterRotationTime() {
  const d = new Date();
  return d.getHours() > 0 || (d.getHours() === 0 && d.getMinutes() >= 1);
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("de-CH");
}

function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function isBanned(member) {
  return member.banned_until && new Date(member.banned_until) > new Date();
}

function isAbsent(member, vacations, dateValue = today()) {
  return vacations.some((v) => {
    if (v.member_id) {
      return (
        v.member_id === member.id &&
        v.from_date <= dateValue &&
        v.until_date >= dateValue
      );
    }

    return (
      v.name?.toLowerCase() === member.name?.toLowerCase() &&
      v.from_date <= dateValue &&
      v.until_date >= dateValue
    );
  });
}

function rankFor(member) {
  const score = (member.count || 0) + (member.golden || 0) * 2;
  if (score >= 30) return "Commander";
  if (score >= 15) return "Elite";
  if (score >= 6) return "Veteran";
  return "Rookie";
}

function shieldLevel(member) {
  const n = member.shield_misses || 0;
  if (n >= 4) return "Rot";
  if (n >= 2) return "Gelb";
  return "Grün";
}

const s = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, rgba(147,192,31,.28), transparent 32%), linear-gradient(135deg,#020402,#071307,#000)",
    color: "#fff",
    padding: 24,
    fontFamily: "Arial, sans-serif",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    padding: 22,
    borderRadius: 24,
    border: "1px solid rgba(147,192,31,.65)",
    background: "rgba(5,10,5,.82)",
    boxShadow: "0 0 40px rgba(147,192,31,.28)",
    marginBottom: 22,
  },
  logo: {
    width: 108,
    height: 108,
    borderRadius: 22,
    objectFit: "cover",
    border: "1px solid #93c01f",
    boxShadow: "0 0 30px rgba(147,192,31,.75)",
  },
  h1: {
    margin: 0,
    fontSize: 44,
    color: "#b8ff3d",
    textShadow: "0 0 18px rgba(147,192,31,.75)",
  },
  muted: { color: "#a7b0a0" },
  card: {
    background: "rgba(7,10,7,.88)",
    border: "1px solid rgba(147,192,31,.28)",
    borderRadius: 22,
    padding: 18,
    marginTop: 16,
    boxShadow: "0 0 26px rgba(147,192,31,.12)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 14,
    marginBottom: 18,
  },
  stat: {
    background: "linear-gradient(180deg,rgba(147,192,31,.16),rgba(0,0,0,.75))",
    border: "1px solid rgba(147,192,31,.45)",
    borderRadius: 18,
    padding: 16,
    textAlign: "center",
  },
  statValue: {
    fontSize: 30,
    fontWeight: 900,
    color: "#b8ff3d",
  },
  btn: {
    background: "linear-gradient(180deg,#caff4a,#93c01f)",
    color: "#061000",
    border: "none",
    borderRadius: 14,
    padding: "11px 15px",
    fontWeight: 900,
    marginRight: 8,
    marginBottom: 8,
    cursor: "pointer",
  },
  btnDark: {
    background: "rgba(0,0,0,.55)",
    color: "#eaffd0",
    border: "1px solid rgba(147,192,31,.45)",
    borderRadius: 14,
    padding: "11px 15px",
    fontWeight: 800,
    marginRight: 8,
    marginBottom: 8,
    cursor: "pointer",
  },
  danger: {
    background: "linear-gradient(180deg,#ff6464,#9f1515)",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "8px 10px",
    fontWeight: 800,
    marginRight: 5,
    marginBottom: 5,
    cursor: "pointer",
  },
  small: {
    background: "#121812",
    color: "#eaffd0",
    border: "1px solid rgba(147,192,31,.4)",
    borderRadius: 10,
    padding: "8px 10px",
    fontWeight: 800,
    marginRight: 5,
    marginBottom: 5,
    cursor: "pointer",
  },
  input: {
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(147,192,31,.4)",
    background: "#050705",
    color: "#fff",
    marginRight: 8,
    marginBottom: 8,
    outline: "none",
  },
  tableWrap: { overflowX: "auto", marginTop: 16 },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    background: "rgba(0,0,0,.35)",
    borderRadius: 16,
    overflow: "hidden",
  },
  th: {
    padding: 12,
    borderBottom: "1px solid rgba(147,192,31,.35)",
    color: "#b8ff3d",
    textAlign: "left",
    background: "rgba(147,192,31,.08)",
  },
  td: {
    padding: 12,
    borderBottom: "1px solid rgba(255,255,255,.07)",
  },
  hero: {
    background: "linear-gradient(90deg,rgba(147,192,31,.24),rgba(0,0,0,.65))",
    border: "2px solid #93c01f",
    borderRadius: 20,
    padding: 18,
    margin: "16px 0",
    fontSize: 26,
    fontWeight: 900,
    color: "#d9ff72",
    boxShadow: "0 0 24px rgba(147,192,31,.42)",
  },
  badge: {
    display: "inline-block",
    padding: "5px 9px",
    borderRadius: 999,
    border: "1px solid rgba(147,192,31,.45)",
    color: "#d9ff72",
    background: "rgba(147,192,31,.12)",
    fontSize: 12,
    fontWeight: 900,
  },
};

export default function App() {
  const [view, setView] = useState("member");
  const [memberTab, setMemberTab] = useState("zug");
  const [adminTab, setAdminTab] = useState("zug");
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);

  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");

  const [members, setMembers] = useState([]);
  const [shieldReports, setShieldReports] = useState([]);
  const [vacations, setVacations] = useState([]);

  const [newMember, setNewMember] = useState("");
  const [shieldName, setShieldName] = useState("");
  const [shieldDate, setShieldDate] = useState(today());

  const [vacMemberId, setVacMemberId] = useState("");
  const [vacFrom, setVacFrom] = useState(today());
  const [vacUntil, setVacUntil] = useState("");

  const [message, setMessage] = useState("");
  const [autoChecked, setAutoChecked] = useState(false);
  const [dragId, setDragId] = useState(null);

  async function loadAll() {
    setMessage("");

    const membersRes = await supabase.from("members").select("*").order("position", { ascending: true });
    const shieldRes = await supabase.from("shield_reports").select("*").order("date", { ascending: false });
    const vacationRes = await supabase.from("vacations").select("*").order("from_date", { ascending: true });

    if (membersRes.error) setMessage("Fehler members: " + membersRes.error.message);
    if (shieldRes.error) setMessage("Fehler shield_reports: " + shieldRes.error.message);
    if (vacationRes.error) setMessage("Fehler vacations: " + vacationRes.error.message);

    setMembers(membersRes.data || []);
    setShieldReports(shieldRes.data || []);
    setVacations(vacationRes.data || []);
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!autoChecked && members.length > 0) {
      setAutoChecked(true);
      checkAutoRotation();
    }
  }, [members, vacations, autoChecked]);

  async function getSetting(key) {
    const res = await supabase.from("app_settings").select("value").eq("key", key).maybeSingle();
    if (res.error) {
      setMessage("Fehler app_settings: " + res.error.message);
      return null;
    }
    return res.data?.value || null;
  }

  async function setSetting(key, value) {
    const res = await supabase.from("app_settings").upsert([{ key, value }]);
    if (res.error) setMessage("Fehler app_settings speichern: " + res.error.message);
  }

  async function checkAutoRotation() {
    if (!nowAfterRotationTime()) return;

    const currentDate = today();
    const lastRotation = await getSetting("last_rotation_date");

    if (lastRotation === currentDate) return;

    await nextTurn(true);
    await setSetting("last_rotation_date", currentDate);
    await loadAll();
    setMessage("Automatische Tagesrotation wurde ausgeführt.");
  }

  const schedule = useMemo(() => {
    let dayOffset = 0;

    return members.map((m) => {
      const absent = isAbsent(m, vacations);
      const banned = isBanned(m);

      if (banned) {
        return {
          ...m,
          absent,
          status: `Gesperrt bis ${formatDate(m.banned_until)}`,
          nextDate: "-",
        };
      }

      if (absent) {
        return {
          ...m,
          absent,
          status: "Abwesend / wird übersprungen",
          nextDate: "-",
        };
      }

      const d = new Date();
      d.setDate(d.getDate() + dayOffset);

      const item = {
        ...m,
        absent,
        status: dayOffset === 0 ? "Heute dran" : `In ${dayOffset} Tag(en)`,
        nextDate: formatDate(d),
      };

      dayOffset += 1;
      return item;
    });
  }, [members, vacations]);

  const next = schedule.find((m) => !isBanned(m) && !m.absent);

  const shieldList = useMemo(() => {
    return [...members].sort((a, b) => {
      const diff = (b.shield_misses || 0) - (a.shield_misses || 0);
      if (diff !== 0) return diff;

      const lastA = shieldReports.find((r) => r.member_name === a.name)?.date || "";
      const lastB = shieldReports.find((r) => r.member_name === b.name)?.date || "";
      return new Date(lastB) - new Date(lastA);
    });
  }, [members, shieldReports]);

  const leaderboard = useMemo(() => {
    return {
      zug: [...members].sort((a, b) => (b.count || 0) - (a.count || 0)).slice(0, 5),
      golden: [...members].sort((a, b) => (b.golden || 0) - (a.golden || 0)).slice(0, 5),
      schild: [...members].sort((a, b) => (b.shield_misses || 0) - (a.shield_misses || 0)).slice(0, 5),
    };
  }, [members]);

  async function normalizePositions() {
    const res = await supabase.from("members").select("*").order("position");

    if (res.error) {
      setMessage("Fehler Positionen: " + res.error.message);
      return;
    }

    const list = res.data || [];
    const active = list.filter((m) => !isBanned(m));
    const banned = list.filter((m) => isBanned(m));
    const ordered = [...active, ...banned];

    for (let i = 0; i < ordered.length; i++) {
      const updateRes = await supabase.from("members").update({ position: i }).eq("id", ordered[i].id);
      if (updateRes.error) {
        setMessage("Fehler Position Update: " + updateRes.error.message);
        return;
      }
    }
  }

  async function addMember() {
    const name = newMember.trim();

    if (!name) {
      setMessage("Bitte Spielername eingeben.");
      return;
    }

    const exists = members.some((m) => m.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      setMessage("Dieser Spieler ist bereits eingetragen.");
      return;
    }

    const activeCount = members.filter((m) => !isBanned(m)).length;

    const res = await supabase.from("members").insert([
      {
        name,
        position: activeCount,
        count: 0,
        golden: 0,
        shield_misses: 0,
        ban_reason: "",
      },
    ]);

    if (res.error) {
      setMessage("Fehler beim Eintragen: " + res.error.message);
      return;
    }

    setNewMember("");
    await normalizePositions();
    await loadAll();
    setMessage("Spieler eingetragen.");
  }

  async function nextTurn(isAuto = false) {
    const available = members.filter((m) => !isBanned(m) && !isAbsent(m, vacations));
    if (!available.length) {
      if (!isAuto) setMessage("Kein verfügbarer Spieler vorhanden.");
      return;
    }

    const first = available[0];

    const res = await supabase
      .from("members")
      .update({
        count: (first.count || 0) + 1,
        position: 9999,
      })
      .eq("id", first.id);

    if (res.error) {
      setMessage("Fehler beim Zug: " + res.error.message);
      return;
    }

    await normalizePositions();
    await loadAll();

    if (!isAuto) setMessage(`${first.name} wurde abgeschlossen und nach unten verschoben.`);
  }

  async function markGolden(member) {
    const res = await supabase.from("members").update({ golden: (member.golden || 0) + 1 }).eq("id", member.id);
    if (res.error) setMessage("Fehler Golden: " + res.error.message);
    await loadAll();
  }

  async function banMember(member, reason) {
    const res = await supabase
      .from("members")
      .update({
        banned_until: addDays(60),
        ban_reason: reason,
        position: 9999,
      })
      .eq("id", member.id);

    if (res.error) setMessage("Fehler Sperre: " + res.error.message);
    await normalizePositions();
    await loadAll();
  }

  async function unbanMember(member) {
    const res = await supabase.from("members").update({ banned_until: null, ban_reason: "" }).eq("id", member.id);

    if (res.error) {
      setMessage("Fehler Entsperren: " + res.error.message);
      return;
    }

    await normalizePositions();
    await loadAll();
  }

  async function deleteMember(member) {
    const res = await supabase.from("members").delete().eq("id", member.id);

    if (res.error) {
      setMessage("Fehler Löschen: " + res.error.message);
      return;
    }

    await normalizePositions();
    await loadAll();
  }

  async function moveMember(member, direction) {
    const index = members.findIndex((m) => m.id === member.id);
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= members.length) return;

    const other = members[targetIndex];

    await supabase.from("members").update({ position: other.position }).eq("id", member.id);
    await supabase.from("members").update({ position: member.position }).eq("id", other.id);

    await loadAll();
  }

  async function reorderMembers(draggedId, targetId) {
    if (!draggedId || !targetId || draggedId === targetId) return;

    const list = [...members];
    const fromIndex = list.findIndex((m) => m.id === draggedId);
    const toIndex = list.findIndex((m) => m.id === targetId);

    if (fromIndex < 0 || toIndex < 0) return;

    const [dragged] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, dragged);

    for (let i = 0; i < list.length; i++) {
      await supabase.from("members").update({ position: i }).eq("id", list[i].id);
    }

    setDragId(null);
    await loadAll();
  }

  async function addShieldMiss(nameInput = null) {
    const name = (nameInput || shieldName).trim();
    if (!name) return;

    let member = members.find((m) => m.name.toLowerCase() === name.toLowerCase());

    if (!member) {
      const res = await supabase
        .from("members")
        .insert([
          {
            name,
            position: members.length,
            count: 0,
            golden: 0,
            shield_misses: 0,
            ban_reason: "",
          },
        ])
        .select()
        .single();

      if (res.error) {
        setMessage("Fehler neuer Spieler: " + res.error.message);
        return;
      }

      member = res.data;
    }

    const reportRes = await supabase.from("shield_reports").insert([
      {
        member_name: name,
        date: shieldDate,
      },
    ]);

    if (reportRes.error) {
      setMessage("Fehler Schild Report: " + reportRes.error.message);
      return;
    }

    const updateRes = await supabase
      .from("members")
      .update({ shield_misses: (member.shield_misses || 0) + 1 })
      .eq("id", member.id);

    if (updateRes.error) {
      setMessage("Fehler Schild-Zähler: " + updateRes.error.message);
      return;
    }

    setShieldName("");
    await normalizePositions();
    await loadAll();
  }

  async function addVacation() {
    if (!vacMemberId || !vacFrom || !vacUntil) {
      setMessage("Bitte Mitglied, von und bis auswählen.");
      return;
    }

    const member = members.find((m) => m.id === vacMemberId);

    if (!member) {
      setMessage("Mitglied nicht gefunden.");
      return;
    }

    const res = await supabase.from("vacations").insert([
      {
        name: member.name,
        member_id: member.id,
        from_date: vacFrom,
        until_date: vacUntil,
      },
    ]);

    if (res.error) {
      setMessage("Fehler Abwesenheit: " + res.error.message);
      return;
    }

    setVacMemberId("");
    setVacFrom(today());
    setVacUntil("");
    await loadAll();
  }

  async function deleteVacation(vacation) {
    const res = await supabase.from("vacations").delete().eq("id", vacation.id);
    if (res.error) {
      setMessage("Fehler Abwesenheit löschen: " + res.error.message);
      return;
    }
    await loadAll();
  }

  async function updateVacation(vacation, field, value) {
    const updateData = { [field]: value };

    if (field === "member_id") {
      const member = members.find((m) => m.id === value);
      updateData.name = member?.name || vacation.name;
    }

    const res = await supabase.from("vacations").update(updateData).eq("id", vacation.id);
    if (res.error) {
      setMessage("Fehler Abwesenheit ändern: " + res.error.message);
      return;
    }
    await loadAll();
  }

  function login() {
    if (loginUser === ADMIN_USER && loginPass === ADMIN_PASS) {
      setAdminLoggedIn(true);
      setLoginPass("");
      setMessage("");
    } else {
      setMessage("Login falsch.");
    }
  }

  return (
    <div style={s.page}>
      <style>{`
        @media (max-width: 700px) {
          body { margin: 0; }
          .coo-header { flex-direction: column; align-items: flex-start !important; }
          .coo-title { font-size: 32px !important; }
          .coo-input { width: 100%; box-sizing: border-box; }
          .coo-actions button { width: 100%; margin-right: 0 !important; }
          .desktop-only-note { display: none; }
        }
      `}</style>

      <Header />

      <div style={s.grid}>
        <Stat label="Mitglieder" value={members.length} />
        <Stat label="Heute dran" value={next?.name || "-"} />
        <Stat label="Gesperrt" value={members.filter(isBanned).length} />
        <Stat label="Abwesend" value={members.filter((m) => isAbsent(m, vacations)).length} />
        <Stat label="Schild Fehler" value={members.reduce((a, b) => a + (b.shield_misses || 0), 0)} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <button style={view === "member" ? s.btn : s.btnDark} onClick={() => setView("member")}>
          Mitgliederansicht
        </button>
        <button style={view === "admin" ? s.btn : s.btnDark} onClick={() => setView("admin")}>
          Adminbereich
        </button>
      </div>

      {message && <div style={{ ...s.card, borderColor: "#93c01f", color: "#d9ff9b" }}>{message}</div>}

      {view === "member" && (
        <div style={s.card}>
          <h2>Mitgliederansicht</h2>
          <TabButton active={memberTab === "zug"} onClick={() => setMemberTab("zug")}>Zug</TabButton>
          <TabButton active={memberTab === "schild"} onClick={() => setMemberTab("schild")}>Schild Report</TabButton>
          <TabButton active={memberTab === "ferien"} onClick={() => setMemberTab("ferien")}>Abwesenheit</TabButton>

          {memberTab === "zug" && (
            <>
              <h3>Zug Warteliste</h3>
              {next && <Hero text={`Heute dran: ${next.name}`} />}

              <input className="coo-input" style={s.input} value={newMember} onChange={(e) => setNewMember(e.target.value)} placeholder="Spielername" />
              <button style={s.btn} onClick={addMember}>Eintragen</button>

              <MemberTable members={schedule} />
              <Leaderboard data={leaderboard} />
            </>
          )}

          {memberTab === "schild" && (
            <>
              <h3>Schild Report</h3>
              <ShieldTable members={shieldList} reports={shieldReports} />
            </>
          )}

          {memberTab === "ferien" && (
            <>
              <h3>Abwesenheit eintragen</h3>
              <MemberSelect members={members} value={vacMemberId} onChange={setVacMemberId} />
              <input className="coo-input" style={s.input} type="date" value={vacFrom} onChange={(e) => setVacFrom(e.target.value)} />
              <input className="coo-input" style={s.input} type="date" value={vacUntil} onChange={(e) => setVacUntil(e.target.value)} />
              <button style={s.btn} onClick={addVacation}>Eintragen</button>
              <VacationTable vacations={vacations} members={members} />
            </>
          )}
        </div>
      )}

      {view === "admin" && !adminLoggedIn && (
        <div style={s.card}>
          <h2>Admin Login</h2>
          <input className="coo-input" style={s.input} value={loginUser} onChange={(e) => setLoginUser(e.target.value)} placeholder="Benutzer" />
          <input className="coo-input" style={s.input} type="password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} placeholder="Passwort" />
          <button style={s.btn} onClick={login}>Login</button>
        </div>
      )}

      {view === "admin" && adminLoggedIn && (
        <div style={s.card}>
          <h2>Adminbereich</h2>
          <TabButton active={adminTab === "zug"} onClick={() => setAdminTab("zug")}>Zugführer</TabButton>
          <TabButton active={adminTab === "schild"} onClick={() => setAdminTab("schild")}>Schild Report</TabButton>
          <TabButton active={adminTab === "ferien"} onClick={() => setAdminTab("ferien")}>Abwesenheit</TabButton>
          <button style={s.btnDark} onClick={() => setAdminLoggedIn(false)}>Logout</button>

          {adminTab === "zug" && (
            <>
              <h3>Zugführer</h3>
              <p className="desktop-only-note" style={s.muted}>Drag & Drop: Zeile ziehen und auf gewünschte Position fallen lassen.</p>
              {next && <Hero text={`Heute dran: ${next.name}`} />}

              <input className="coo-input" style={s.input} value={newMember} onChange={(e) => setNewMember(e.target.value)} placeholder="Spielername" />
              <button style={s.btn} onClick={addMember}>Hinzufügen</button>
              <button style={s.btn} onClick={() => nextTurn(false)}>Täglichen Zug erledigen</button>

              <AdminMemberTable
                members={schedule}
                onMove={moveMember}
                onGolden={markGolden}
                onShield={addShieldMiss}
                onBan={banMember}
                onUnban={unbanMember}
                onDelete={deleteMember}
                dragId={dragId}
                setDragId={setDragId}
                reorderMembers={reorderMembers}
              />
              <Leaderboard data={leaderboard} />
            </>
          )}

          {adminTab === "schild" && (
            <>
              <h3>Schild Report</h3>
              <input className="coo-input" style={s.input} value={shieldName} onChange={(e) => setShieldName(e.target.value)} placeholder="Spielername" />
              <input className="coo-input" style={s.input} type="date" value={shieldDate} onChange={(e) => setShieldDate(e.target.value)} />
              <button style={s.btn} onClick={() => addShieldMiss()}>Eintragen</button>
              <ShieldTable members={shieldList} reports={shieldReports} admin onShield={addShieldMiss} onBan={banMember} />
            </>
          )}

          {adminTab === "ferien" && (
            <>
              <h3>Abwesenheit bearbeiten</h3>
              <VacationTable vacations={vacations} members={members} admin onDelete={deleteVacation} onUpdate={updateVacation} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Header() {
  return (
    <header className="coo-header" style={s.header}>
      <img src="/logo.png" alt="COO Logo" style={s.logo} />
      <div>
        <h1 className="coo-title" style={s.h1}>COO Club Zero</h1>
        <p style={s.muted}>Neon Control Center · Zugführer · Schild Report · Abwesenheit</p>
      </div>
    </header>
  );
}

function Stat({ label, value }) {
  return (
    <div style={s.stat}>
      <div style={s.statValue}>{value}</div>
      <div style={s.muted}>{label}</div>
    </div>
  );
}

function Hero({ text }) {
  return <div style={s.hero}>🚆 {text}</div>;
}

function TabButton({ active, onClick, children }) {
  return (
    <button style={active ? s.btn : s.btnDark} onClick={onClick}>
      {children}
    </button>
  );
}

function MemberSelect({ members, value, onChange }) {
  return (
    <select
      className="coo-input"
      style={s.input}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Mitglied auswählen</option>
      {members.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
    </select>
  );
}

function Leaderboard({ data }) {
  return (
    <div style={s.grid}>
      <Board title="Top Züge" list={data.zug} field="count" />
      <Board title="Top Golden" list={data.golden} field="golden" />
      <Board title="Schild Fails" list={data.schild} field="shield_misses" />
    </div>
  );
}

function Board({ title, list, field }) {
  return (
    <div style={s.card}>
      <h3>{title}</h3>
      {list.length === 0 ? (
        <p style={s.muted}>Noch keine Daten</p>
      ) : (
        list.map((m, i) => (
          <div key={m.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
            <span>{i + 1}. {m.name}</span>
            <b style={{ color: "#b8ff3d" }}>{m[field] || 0}</b>
          </div>
        ))
      )}
    </div>
  );
}

function MemberTable({ members }) {
  return (
    <Table headers={["Position", "Name", "Rang", "Termin", "Status"]}>
      {members.map((m, i) => (
        <tr key={m.id} style={{ opacity: m.absent || isBanned(m) ? 0.55 : 1 }}>
          <td style={s.td}>{i + 1}</td>
          <td style={s.td}><b>{m.name}</b></td>
          <td style={s.td}><span style={s.badge}>{rankFor(m)}</span></td>
          <td style={s.td}>{m.nextDate}</td>
          <td style={s.td}>{m.status}</td>
        </tr>
      ))}
    </Table>
  );
}

function AdminMemberTable({ members, onMove, onGolden, onShield, onBan, onUnban, onDelete, dragId, setDragId, reorderMembers }) {
  return (
    <Table headers={["Pos", "Name", "Rang", "Termin", "Status", "Züge", "Golden", "Schild", "Aktionen"]}>
      {members.map((m, i) => (
        <tr
          key={m.id}
          draggable
          onDragStart={() => setDragId(m.id)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => reorderMembers(dragId, m.id)}
          style={{
            opacity: m.absent || isBanned(m) ? 0.55 : 1,
            cursor: "grab",
            outline: dragId === m.id ? "2px solid #b8ff3d" : "none",
          }}
        >
          <td style={s.td}>{i + 1}</td>
          <td style={s.td}><b>{m.name}</b></td>
          <td style={s.td}><span style={s.badge}>{rankFor(m)}</span></td>
          <td style={s.td}>{m.nextDate}</td>
          <td style={s.td}>{m.status}</td>
          <td style={s.td}>{m.count || 0}</td>
          <td style={s.td}>{m.golden || 0}</td>
          <td style={s.td}>{m.shield_misses || 0}</td>
          <td style={s.td}>
            <button style={s.small} onClick={() => onMove(m, -1)}>↑</button>
            <button style={s.small} onClick={() => onMove(m, 1)}>↓</button>
            <button style={s.small} onClick={() => onGolden(m)}>Golden</button>
            <button style={s.small} onClick={() => onShield(m.name)}>Schild</button>
            <button style={s.danger} onClick={() => onBan(m, "Zug nicht erledigt")}>60d</button>
            {isBanned(m) && <button style={s.small} onClick={() => onUnban(m)}>Entsperren</button>}
            <button style={s.danger} onClick={() => onDelete(m)}>Löschen</button>
          </td>
        </tr>
      ))}
    </Table>
  );
}

function ShieldTable({ members, reports, admin, onShield, onBan }) {
  return (
    <Table headers={admin ? ["Name", "Warnung", "Anzahl", "Letztes Datum", "Alle Meldungen", "Aktionen"] : ["Name", "Warnung", "Anzahl", "Letztes Datum", "Alle Meldungen"]}>
      {members.map((m) => {
        const memberReports = reports.filter((r) => r.member_name === m.name);
        const level = shieldLevel(m);

        return (
          <tr key={m.id}>
            <td style={s.td}><b>{m.name}</b></td>
            <td style={s.td}><span style={{ ...s.badge, color: level === "Rot" ? "#ff7777" : level === "Gelb" ? "#ffe066" : "#b8ff3d" }}>{level}</span></td>
            <td style={s.td}>{m.shield_misses || 0}</td>
            <td style={s.td}>{memberReports[0] ? formatDate(memberReports[0].date) : "-"}</td>
            <td style={s.td}>{memberReports.map((r) => formatDate(r.date)).join(", ") || "-"}</td>
            {admin && (
              <td style={s.td}>
                <button style={s.small} onClick={() => onShield(m.name)}>+1</button>
                <button style={s.danger} onClick={() => onBan(m, "Schild nicht gesetzt")}>60d Sperre</button>
              </td>
            )}
          </tr>
        );
      })}
    </Table>
  );
}

function VacationTable({ vacations, members, admin, onDelete, onUpdate }) {
  return (
    <Table headers={admin ? ["Mitglied", "Von", "Bis", "Aktionen"] : ["Mitglied", "Von", "Bis"]}>
      {vacations.map((v) => (
        <tr key={v.id}>
          <td style={s.td}>
            {admin ? (
              <MemberSelect
                members={members}
                value={v.member_id || ""}
                onChange={(value) => onUpdate(v, "member_id", value)}
              />
            ) : (
              <b>{v.name}</b>
            )}
          </td>
          <td style={s.td}>
            {admin ? <input style={s.input} type="date" value={v.from_date} onChange={(e) => onUpdate(v, "from_date", e.target.value)} /> : formatDate(v.from_date)}
          </td>
          <td style={s.td}>
            {admin ? <input style={s.input} type="date" value={v.until_date} onChange={(e) => onUpdate(v, "until_date", e.target.value)} /> : formatDate(v.until_date)}
          </td>
          {admin && (
            <td style={s.td}>
              <button style={s.danger} onClick={() => onDelete(v)}>Löschen</button>
            </td>
          )}
        </tr>
      ))}
    </Table>
  );
}

function Table({ headers, children }) {
  return (
    <div style={s.tableWrap}>
      <table style={s.table}>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} style={s.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
