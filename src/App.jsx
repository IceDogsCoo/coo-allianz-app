import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const ADMIN_USER = "CooAdmin";
const ADMIN_PASS = "Server2245Coo";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

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

  async function loadAll() {
    const membersRes = await supabase.from("members").select("*").order("position");
    const shieldRes = await supabase.from("shield_reports").select("*").order("date", { ascending: false });
    const vacationRes = await supabase.from("vacations").select("*").order("from_date");

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
        return { ...m, status: `Gesperrt bis ${formatDate(m.banned_until)}`, nextDate: "-" };
      }
      const d = new Date();
      d.setDate(d.getDate() + dayOffset);
      const status = dayOffset === 0 ? "Heute dran" : `In ${dayOffset} Tag(en)`;
      dayOffset++;
      return { ...m, status, nextDate: formatDate(d) };
    });
  }, [members]);

  const shieldList = useMemo(() => {
    return [...members].sort((a, b) => {
      if ((b.shield_misses || 0) !== (a.shield_misses || 0)) {
        return (b.shield_misses || 0) - (a.shield_misses || 0);
      }

      const lastA = shieldReports.find((r) => r.member_name === a.name)?.date || "";
      const lastB = shieldReports.find((r) => r.member_name === b.name)?.date || "";
      return new Date(lastB) - new Date(lastA);
    });
  }, [members, shieldReports]);

  async function addMember() {
    const name = newMember.trim();
    if (!name) return;

    const active = members.filter((m) => !isBanned(m));
    const position = active.length;

    await supabase.from("members").insert({
      name,
      position,
      count: 0,
      golden: 0,
      shield_misses: 0,
    });

    setNewMember("");
    await normalizePositions();
    await loadAll();
  }

  async function normalizePositions() {
    const all = await supabase.from("members").select("*").order("position");
    const list = all.data || [];
    const active = list.filter((m) => !isBanned(m));
    const banned = list.filter((m) => isBanned(m));
    const ordered = [...active, ...banned];

    for (let i = 0; i < ordered.length; i++) {
      await supabase.from("members").update({ position: i }).eq("id", ordered[i].id);
    }
  }

  async function nextTurn() {
    const active = members.filter((m) => !isBanned(m));
    if (!active.length) return;

    const first = active[0];

    await supabase
      .from("members")
      .update({
        count: (first.count || 0) + 1,
        position: 9999,
      })
      .eq("id", first.id);

    await normalizePositions();
    await loadAll();
  }

  async function markGolden(member) {
    await supabase
      .from("members")
      .update({ golden: (member.golden || 0) + 1 })
      .eq("id", member.id);

    await loadAll();
  }

  async function banMember(member, reason) {
    await supabase
      .from("members")
      .update({
        banned_until: addDays(60),
        ban_reason: reason,
        position: 9999,
      })
      .eq("id", member.id);

    await normalizePositions();
    await loadAll();
  }

  async function unbanMember(member) {
    await supabase
      .from("members")
      .update({
        banned_until: null,
        ban_reason: null,
      })
      .eq("id", member.id);

    await normalizePositions();
    await loadAll();
  }

  async function deleteMember(member) {
    await supabase.from("members").delete().eq("id", member.id);
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

  async function addShieldMiss(nameInput = null) {
    const name = (nameInput || shieldName).trim();
    if (!name) return;

    let member = members.find((m) => m.name.toLowerCase() === name.toLowerCase());

    if (!member) {
      const res = await supabase
        .from("members")
        .insert({
          name,
          position: members.length,
          count: 0,
          golden: 0,
          shield_misses: 0,
        })
        .select()
        .single();

      member = res.data;
    }

    await supabase.from("shield_reports").insert({
      member_name: name,
      date: shieldDate,
    });

    await supabase
      .from("members")
      .update({ shield_misses: (member.shield_misses || 0) + 1 })
      .eq("id", member.id);

    setShieldName("");
    await loadAll();
  }

  async function addVacation() {
    if (!vacName.trim() || !vacFrom || !vacUntil) return;

    await supabase.from("vacations").insert({
      name: vacName.trim(),
      from_date: vacFrom,
      until_date: vacUntil,
    });

    setVacName("");
    setVacFrom(today());
    setVacUntil("");
    await loadAll();
  }

  async function deleteVacation(vacation) {
    await supabase.from("vacations").delete().eq("id", vacation.id);
    await loadAll();
  }

  async function updateVacation(vacation, field, value) {
    await supabase.from("vacations").update({ [field]: value }).eq("id", vacation.id);
    await loadAll();
  }

  function login() {
    if (loginUser === ADMIN_USER && loginPass === ADMIN_PASS) {
      setAdminLoggedIn(true);
      setLoginPass("");
    } else {
      alert("Login falsch");
    }
  }

  const next = schedule.find((m) => !isBanned(m));

  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "#fff", padding: 20, fontFamily: "Arial" }}>
      <header style={{ display: "flex", gap: 15, alignItems: "center", marginBottom: 20 }}>
        <div style={{ width: 90, height: 90, borderRadius: 16, background: "#111", border: "2px solid #93c01f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 42 }}>
          ☠
        </div>
        <div>
          <h1 style={{ color: "#93c01f", margin: 0 }}>COO Club Zero</h1>
          <p style={{ color: "#aaa", margin: 0 }}>Zugführer · Schild Report · Abwesenheit</p>
        </div>
      </header>

      <button onClick={() => setView("member")}>Mitgliederansicht</button>{" "}
      <button onClick={() => setView("admin")}>Adminbereich</button>

      {view === "member" && (
        <>
          <h2>Mitgliederansicht</h2>
          <button onClick={() => setMemberTab("zug")}>Zug</button>{" "}
          <button onClick={() => setMemberTab("schild")}>Schild Report</button>{" "}
          <button onClick={() => setMemberTab("ferien")}>Abwesenheit</button>

          {memberTab === "zug" && (
            <section>
              <h3>Zug Warteliste</h3>
              {next && <h2 style={{ color: "#93c01f" }}>Heute dran: {next.name}</h2>}
              <input value={newMember} onChange={(e) => setNewMember(e.target.value)} placeholder="Spielername" />
              <button onClick={addMember}>Eintragen</button>
              <MemberTable members={schedule} publicView />
            </section>
          )}

          {memberTab === "schild" && (
            <section>
              <h3>Schild Report</h3>
              <ShieldTable members={shieldList} reports={shieldReports} />
            </section>
          )}

          {memberTab === "ferien" && (
            <section>
              <h3>Abwesenheit eintragen</h3>
              <input value={vacName} onChange={(e) => setVacName(e.target.value)} placeholder="Name" />
              <input type="date" value={vacFrom} onChange={(e) => setVacFrom(e.target.value)} />
              <input type="date" value={vacUntil} onChange={(e) => setVacUntil(e.target.value)} />
              <button onClick={addVacation}>Eintragen</button>
              <VacationTable vacations={vacations} />
            </section>
          )}
        </>
      )}

      {view === "admin" && !adminLoggedIn && (
        <section>
          <h2>Admin Login</h2>
          <input value={loginUser} onChange={(e) => setLoginUser(e.target.value)} placeholder="Benutzer" />
          <input type="password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} placeholder="Passwort" />
          <button onClick={login}>Login</button>
        </section>
      )}

      {view === "admin" && adminLoggedIn && (
        <>
          <h2>Adminbereich</h2>
          <button onClick={() => setAdminTab("zug")}>Zugführer</button>{" "}
          <button onClick={() => setAdminTab("schild")}>Schild Report</button>{" "}
          <button onClick={() => setAdminTab("ferien")}>Abwesenheit</button>{" "}
          <button onClick={() => setAdminLoggedIn(false)}>Logout</button>

          {adminTab === "zug" && (
            <section>
              <h3>Zugführer</h3>
              {next && <h2 style={{ color: "#93c01f" }}>Heute dran: {next.name}</h2>}
              <input value={newMember} onChange={(e) => setNewMember(e.target.value)} placeholder="Spielername" />
              <button onClick={addMember}>Hinzufügen</button>
              <button onClick={nextTurn}>Täglichen Zug erledigen</button>

              <AdminMemberTable
                members={schedule}
                onMove={moveMember}
                onGolden={markGolden}
                onShield={addShieldMiss}
                onBan={banMember}
                onUnban={unbanMember}
                onDelete={deleteMember}
              />
            </section>
          )}

          {adminTab === "schild" && (
            <section>
              <h3>Schild Report</h3>
              <input value={shieldName} onChange={(e) => setShieldName(e.target.value)} placeholder="Spielername" />
              <input type="date" value={shieldDate} onChange={(e) => setShieldDate(e.target.value)} />
              <button onClick={() => addShieldMiss()}>Eintragen</button>
              <ShieldTable members={shieldList} reports={shieldReports} admin onShield={addShieldMiss} onBan={banMember} />
            </section>
          )}

          {adminTab === "ferien" && (
            <section>
              <h3>Abwesenheit bearbeiten</h3>
              <VacationTable vacations={vacations} admin onDelete={deleteVacation} onUpdate={updateVacation} />
            </section>
          )}
        </>
      )}
    </div>
  );
}

function MemberTable({ members }) {
  return (
    <table border="1" cellPadding="8" style={{ marginTop: 15, borderCollapse: "collapse", width: "100%" }}>
      <thead>
        <tr>
          <th>Position</th>
          <th>Name</th>
          <th>Termin</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {members.map((m, i) => (
          <tr key={m.id}>
            <td>{i + 1}</td>
            <td>{m.name}</td>
            <td>{m.nextDate}</td>
            <td>{m.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AdminMemberTable({ members, onMove, onGolden, onShield, onBan, onUnban, onDelete }) {
  return (
    <table border="1" cellPadding="8" style={{ marginTop: 15, borderCollapse: "collapse", width: "100%" }}>
      <thead>
        <tr>
          <th>Pos</th>
          <th>Name</th>
          <th>Termin</th>
          <th>Status</th>
          <th>Züge</th>
          <th>Golden</th>
          <th>Schild</th>
          <th>Aktionen</th>
        </tr>
      </thead>
      <tbody>
        {members.map((m, i) => (
          <tr key={m.id}>
            <td>{i + 1}</td>
            <td>{m.name}</td>
            <td>{m.nextDate}</td>
            <td>{m.status}</td>
            <td>{m.count || 0}</td>
            <td>{m.golden || 0}</td>
            <td>{m.shield_misses || 0}</td>
            <td>
              <button onClick={() => onMove(m, -1)}>↑</button>
              <button onClick={() => onMove(m, 1)}>↓</button>
              <button onClick={() => onGolden(m)}>Golden</button>
              <button onClick={() => onShield(m.name)}>Schild vergessen</button>
              <button onClick={() => onBan(m, "Zug nicht erledigt")}>60d Sperre</button>
              {isBanned(m) && <button onClick={() => onUnban(m)}>Entsperren</button>}
              <button onClick={() => onDelete(m)}>Löschen</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ShieldTable({ members, reports, admin, onShield, onBan }) {
  return (
    <table border="1" cellPadding="8" style={{ marginTop: 15, borderCollapse: "collapse", width: "100%" }}>
      <thead>
        <tr>
          <th>Name</th>
          <th>Anzahl vergessen</th>
          <th>Letztes Datum</th>
          <th>Alle Meldungen</th>
          {admin && <th>Aktionen</th>}
        </tr>
      </thead>
      <tbody>
        {members.map((m) => {
          const memberReports = reports.filter((r) => r.member_name === m.name);
          return (
            <tr key={m.id}>
              <td>{m.name}</td>
              <td>{m.shield_misses || 0}</td>
              <td>{memberReports[0] ? formatDate(memberReports[0].date) : "-"}</td>
              <td>{memberReports.map((r) => formatDate(r.date)).join(", ") || "-"}</td>
              {admin && (
                <td>
                  <button onClick={() => onShield(m.name)}>+1</button>
                  <button onClick={() => onBan(m, "Schild nicht gesetzt")}>60d Sperre</button>
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function VacationTable({ vacations, admin, onDelete, onUpdate }) {
  return (
    <table border="1" cellPadding="8" style={{ marginTop: 15, borderCollapse: "collapse", width: "100%" }}>
      <thead>
        <tr>
          <th>Name</th>
          <th>Von</th>
          <th>Bis</th>
          {admin && <th>Aktionen</th>}
        </tr>
      </thead>
      <tbody>
        {vacations.map((v) => (
          <tr key={v.id}>
            <td>{v.name}</td>
            <td>
              {admin ? <input type="date" value={v.from_date} onChange={(e) => onUpdate(v, "from_date", e.target.value)} /> : formatDate(v.from_date)}
            </td>
            <td>
              {admin ? <input type="date" value={v.until_date} onChange={(e) => onUpdate(v, "until_date", e.target.value)} /> : formatDate(v.until_date)}
            </td>
            {admin && (
              <td>
                <button onClick={() => onDelete(v)}>Löschen</button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
