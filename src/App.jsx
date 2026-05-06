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

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg,#020202,#071306,#000)",
    color: "#fff",
    padding: 24,
    fontFamily: "Arial, sans-serif",
  },
  card: {
    background: "#0d0d0d",
    border: "1px solid #23351a",
    borderRadius: 18,
    padding: 18,
    marginTop: 16,
    boxShadow: "0 0 22px rgba(147,192,31,0.12)",
  },
  btn: {
    background: "#93c01f",
    color: "#000",
    border: "none",
    borderRadius: 10,
    padding: "10px 14px",
    fontWeight: 800,
    marginRight: 8,
    marginBottom: 8,
    cursor: "pointer",
  },
  btnDark: {
    background: "#1b1b1b",
    color: "#fff",
    border: "1px solid #93c01f",
    borderRadius: 10,
    padding: "10px 14px",
    fontWeight: 700,
    marginRight: 8,
    marginBottom: 8,
    cursor: "pointer",
  },
  input: {
    padding: 11,
    borderRadius: 10,
    border: "1px solid #444",
    background: "#050505",
    color: "#fff",
    marginRight: 8,
    marginBottom: 8,
  },
  th: {
    padding: 10,
    borderBottom: "1px solid #333",
    color: "#93c01f",
    textAlign: "left",
  },
  td: {
    padding: 10,
    borderBottom: "1px solid #222",
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

  const [vacName, setVacName] = useState("");
  const [vacFrom, setVacFrom] = useState(today());
  const [vacUntil, setVacUntil] = useState("");

  const [message, setMessage] = useState("");

  async function loadAll() {
    setMessage("");

    const membersRes = await supabase
      .from("members")
      .select("*")
      .order("position", { ascending: true });

    const shieldRes = await supabase
      .from("shield_reports")
      .select("*")
      .order("date", { ascending: false });

    const vacationRes = await supabase
      .from("vacations")
      .select("*")
      .order("from_date", { ascending: true });

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

  const schedule = useMemo(() => {
    let dayOffset = 0;

    return members.map((m) => {
      if (isBanned(m)) {
        return {
          ...m,
          status: `Gesperrt bis ${formatDate(m.banned_until)}`,
          nextDate: "-",
        };
      }

      const d = new Date();
      d.setDate(d.getDate() + dayOffset);

      const item = {
        ...m,
        status: dayOffset === 0 ? "Heute dran" : `In ${dayOffset} Tag(en)`,
        nextDate: formatDate(d),
      };

      dayOffset += 1;
      return item;
    });
  }, [members]);

  const next = schedule.find((m) => !isBanned(m));

  const shieldList = useMemo(() => {
    return [...members].sort((a, b) => {
      const diff = (b.shield_misses || 0) - (a.shield_misses || 0);
      if (diff !== 0) return diff;

      const lastA = shieldReports.find((r) => r.member_name === a.name)?.date || "";
      const lastB = shieldReports.find((r) => r.member_name === b.name)?.date || "";
      return new Date(lastB) - new Date(lastA);
    });
  }, [members, shieldReports]);

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
      const updateRes = await supabase
        .from("members")
        .update({ position: i })
        .eq("id", ordered[i].id);

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
      console.log(res.error);
      return;
    }

    setNewMember("");
    await normalizePositions();
    await loadAll();
    setMessage("Spieler eingetragen.");
  }

  async function nextTurn() {
    const active = members.filter((m) => !isBanned(m));
    if (!active.length) return;

    const first = active[0];

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
  }

  async function markGolden(member) {
    const res = await supabase
      .from("members")
      .update({ golden: (member.golden || 0) + 1 })
      .eq("id", member.id);

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
    const res = await supabase
      .from("members")
      .update({ banned_until: null, ban_reason: "" })
      .eq("id", member.id);

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

    const res1 = await supabase
      .from("members")
      .update({ position: other.position })
      .eq("id", member.id);

    if (res1.error) {
      setMessage("Fehler Verschieben 1: " + res1.error.message);
      return;
    }

    const res2 = await supabase
      .from("members")
      .update({ position: member.position })
      .eq("id", other.id);

    if (res2.error) {
      setMessage("Fehler Verschieben 2: " + res2.error.message);
      return;
    }

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
        console.log(res.error);
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
    if (!vacName.trim() || !vacFrom || !vacUntil) {
      setMessage("Bitte Name, von und bis eintragen.");
      return;
    }

    const res = await supabase.from("vacations").insert([
      {
        name: vacName.trim(),
        from_date: vacFrom,
        until_date: vacUntil,
      },
    ]);

    if (res.error) {
      setMessage("Fehler Abwesenheit: " + res.error.message);
      return;
    }

    setVacName("");
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
    const res = await supabase
      .from("vacations")
      .update({ [field]: value })
      .eq("id", vacation.id);

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
    <div style={styles.page}>
      <Header />

      <div style={{ marginBottom: 16 }}>
        <button style={view === "member" ? styles.btn : styles.btnDark} onClick={() => setView("member")}>
          Mitgliederansicht
        </button>
        <button style={view === "admin" ? styles.btn : styles.btnDark} onClick={() => setView("admin")}>
          Adminbereich
        </button>
      </div>

      {message && (
        <div style={{ ...styles.card, borderColor: "#93c01f", color: "#d9ff9b" }}>
          {message}
        </div>
      )}

      {view === "member" && (
        <div style={styles.card}>
          <h2>Mitgliederansicht</h2>

          <TabButton active={memberTab === "zug"} onClick={() => setMemberTab("zug")}>
            Zug
          </TabButton>
          <TabButton active={memberTab === "schild"} onClick={() => setMemberTab("schild")}>
            Schild Report
          </TabButton>
          <TabButton active={memberTab === "ferien"} onClick={() => setMemberTab("ferien")}>
            Abwesenheit
          </TabButton>

          {memberTab === "zug" && (
            <>
              <h3>Zug Warteliste</h3>
              {next && <Hero text={`Heute dran: ${next.name}`} />}

              <input
                style={styles.input}
                value={newMember}
                onChange={(e) => setNewMember(e.target.value)}
                placeholder="Spielername"
              />
              <button style={styles.btn} onClick={addMember}>
                Eintragen
              </button>

              <MemberTable members={schedule} />
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

              <input
                style={styles.input}
                value={vacName}
                onChange={(e) => setVacName(e.target.value)}
                placeholder="Name"
              />
              <input style={styles.input} type="date" value={vacFrom} onChange={(e) => setVacFrom(e.target.value)} />
              <input style={styles.input} type="date" value={vacUntil} onChange={(e) => setVacUntil(e.target.value)} />
              <button style={styles.btn} onClick={addVacation}>
                Eintragen
              </button>

              <VacationTable vacations={vacations} />
            </>
          )}
        </div>
      )}

      {view === "admin" && !adminLoggedIn && (
        <div style={styles.card}>
          <h2>Admin Login</h2>

          <input
            style={styles.input}
            value={loginUser}
            onChange={(e) => setLoginUser(e.target.value)}
            placeholder="Benutzer"
          />
          <input
            style={styles.input}
            type="password"
            value={loginPass}
            onChange={(e) => setLoginPass(e.target.value)}
            placeholder="Passwort"
          />
          <button style={styles.btn} onClick={login}>
            Login
          </button>
        </div>
      )}

      {view === "admin" && adminLoggedIn && (
        <div style={styles.card}>
          <h2>Adminbereich</h2>

          <TabButton active={adminTab === "zug"} onClick={() => setAdminTab("zug")}>
            Zugführer
          </TabButton>
          <TabButton active={adminTab === "schild"} onClick={() => setAdminTab("schild")}>
            Schild Report
          </TabButton>
          <TabButton active={adminTab === "ferien"} onClick={() => setAdminTab("ferien")}>
            Abwesenheit
          </TabButton>
          <button style={styles.btnDark} onClick={() => setAdminLoggedIn(false)}>
            Logout
          </button>

          {adminTab === "zug" && (
            <>
              <h3>Zugführer</h3>
              {next && <Hero text={`Heute dran: ${next.name}`} />}

              <input
                style={styles.input}
                value={newMember}
                onChange={(e) => setNewMember(e.target.value)}
                placeholder="Spielername"
              />
              <button style={styles.btn} onClick={addMember}>
                Hinzufügen
              </button>
              <button style={styles.btn} onClick={nextTurn}>
                Täglichen Zug erledigen
              </button>

              <AdminMemberTable
                members={schedule}
                onMove={moveMember}
                onGolden={markGolden}
                onShield={addShieldMiss}
                onBan={banMember}
                onUnban={unbanMember}
                onDelete={deleteMember}
              />
            </>
          )}

          {adminTab === "schild" && (
            <>
              <h3>Schild Report</h3>

              <input
                style={styles.input}
                value={shieldName}
                onChange={(e) => setShieldName(e.target.value)}
                placeholder="Spielername"
              />
              <input
                style={styles.input}
                type="date"
                value={shieldDate}
                onChange={(e) => setShieldDate(e.target.value)}
              />
              <button style={styles.btn} onClick={() => addShieldMiss()}>
                Eintragen
              </button>

              <ShieldTable members={shieldList} reports={shieldReports} admin onShield={addShieldMiss} onBan={banMember} />
            </>
          )}

          {adminTab === "ferien" && (
            <>
              <h3>Abwesenheit bearbeiten</h3>
              <VacationTable vacations={vacations} admin onDelete={deleteVacation} onUpdate={updateVacation} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function function Header() {
  return (
    <header
      style={{
        display: "flex",
        gap: 20,
        alignItems: "center",
        marginBottom: 30,
        padding: 20,
        borderRadius: 18,
        background: "linear-gradient(90deg,#050505,#0d1a07)",
        border: "1px solid #93c01f",
        boxShadow: "0 0 30px rgba(147,192,31,0.25)",
      }}
    >
      <img
        src="/logo.png"
        alt="COO Logo"
        style={{
          width: 90,
          height: 90,
          borderRadius: 16,
          objectFit: "cover",
          boxShadow: "0 0 25px rgba(147,192,31,0.6)",
        }}
      />

      <div>
        <h1 style={{ color: "#93c01f", margin: 0, fontSize: 42 }}>
          COO Club Zero
        </h1>
        <p style={{ color: "#aaa", marginTop: 6 }}>
          Zugführer · Schild Report · Abwesenheit
        </p>
      </div>
    </header>
  );
}() {
  return (
    <header style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 24 }}>
      <div
        style={{
          width: 94,
          height: 94,
          borderRadius: 22,
          border: "2px solid #93c01f",
          boxShadow: "0 0 25px rgba(147,192,31,.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 42,
        }}
      >
        ☠
      </div>
      <div>
        <h1 style={{ color: "#93c01f", margin: 0, fontSize: 42 }}>COO Club Zero</h1>
        <p style={{ color: "#aaa", marginTop: 6 }}>Zugführer · Schild Report · Abwesenheit</p>
      </div>
    </header>
  );
}

function Hero({ text }) {
  return (
    <div
      style={{
        background: "#132008",
        border: "1px solid #93c01f",
        borderRadius: 16,
        padding: 16,
        margin: "14px 0",
        fontSize: 24,
        fontWeight: 900,
        color: "#bfff4d",
      }}
    >
      {text}
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button style={active ? styles.btn : styles.btnDark} onClick={onClick}>
      {children}
    </button>
  );
}

function MemberTable({ members }) {
  return (
    <Table headers={["Position", "Name", "Termin", "Status"]}>
      {members.map((m, i) => (
        <tr key={m.id}>
          <td style={styles.td}>{i + 1}</td>
          <td style={styles.td}>{m.name}</td>
          <td style={styles.td}>{m.nextDate}</td>
          <td style={styles.td}>{m.status}</td>
        </tr>
      ))}
    </Table>
  );
}

function AdminMemberTable({ members, onMove, onGolden, onShield, onBan, onUnban, onDelete }) {
  return (
    <Table headers={["Pos", "Name", "Termin", "Status", "Züge", "Golden", "Schild", "Aktionen"]}>
      {members.map((m, i) => (
        <tr key={m.id}>
          <td style={styles.td}>{i + 1}</td>
          <td style={styles.td}>{m.name}</td>
          <td style={styles.td}>{m.nextDate}</td>
          <td style={styles.td}>{m.status}</td>
          <td style={styles.td}>{m.count || 0}</td>
          <td style={styles.td}>{m.golden || 0}</td>
          <td style={styles.td}>{m.shield_misses || 0}</td>
          <td style={styles.td}>
            <button onClick={() => onMove(m, -1)}>↑</button>
            <button onClick={() => onMove(m, 1)}>↓</button>
            <button onClick={() => onGolden(m)}>Golden</button>
            <button onClick={() => onShield(m.name)}>Schild</button>
            <button onClick={() => onBan(m, "Zug nicht erledigt")}>60d</button>
            {isBanned(m) && <button onClick={() => onUnban(m)}>Entsperren</button>}
            <button onClick={() => onDelete(m)}>Löschen</button>
          </td>
        </tr>
      ))}
    </Table>
  );
}

function ShieldTable({ members, reports, admin, onShield, onBan }) {
  return (
    <Table
      headers={
        admin
          ? ["Name", "Anzahl", "Letztes Datum", "Alle Meldungen", "Aktionen"]
          : ["Name", "Anzahl", "Letztes Datum", "Alle Meldungen"]
      }
    >
      {members.map((m) => {
        const memberReports = reports.filter((r) => r.member_name === m.name);

        return (
          <tr key={m.id}>
            <td style={styles.td}>{m.name}</td>
            <td style={styles.td}>{m.shield_misses || 0}</td>
            <td style={styles.td}>{memberReports[0] ? formatDate(memberReports[0].date) : "-"}</td>
            <td style={styles.td}>{memberReports.map((r) => formatDate(r.date)).join(", ") || "-"}</td>
            {admin && (
              <td style={styles.td}>
                <button onClick={() => onShield(m.name)}>+1</button>
                <button onClick={() => onBan(m, "Schild nicht gesetzt")}>60d Sperre</button>
              </td>
            )}
          </tr>
        );
      })}
    </Table>
  );
}

function VacationTable({ vacations, admin, onDelete, onUpdate }) {
  return (
    <Table headers={admin ? ["Name", "Von", "Bis", "Aktionen"] : ["Name", "Von", "Bis"]}>
      {vacations.map((v) => (
        <tr key={v.id}>
          <td style={styles.td}>{v.name}</td>
          <td style={styles.td}>
            {admin ? (
              <input type="date" value={v.from_date} onChange={(e) => onUpdate(v, "from_date", e.target.value)} />
            ) : (
              formatDate(v.from_date)
            )}
          </td>
          <td style={styles.td}>
            {admin ? (
              <input type="date" value={v.until_date} onChange={(e) => onUpdate(v, "until_date", e.target.value)} />
            ) : (
              formatDate(v.until_date)
            )}
          </td>
          {admin && (
            <td style={styles.td}>
              <button onClick={() => onDelete(v)}>Löschen</button>
            </td>
          )}
        </tr>
      ))}
    </Table>
  );
}

function Table({ headers, children }) {
  return (
    <div style={{ overflowX: "auto", marginTop: 16 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} style={styles.th}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
