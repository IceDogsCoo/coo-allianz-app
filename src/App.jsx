import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function App() {
  const [members, setMembers] = useState([]);
  const [name, setName] = useState("");

  // Mitglieder laden
  async function loadMembers() {
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .order("position", { ascending: true });

    if (error) {
      console.error("Fehler beim Laden:", error);
    } else {
      setMembers(data || []);
    }
  }

  useEffect(() => {
    loadMembers();
  }, []);

  // Neues Mitglied hinzufügen
  async function addMember() {
    if (!name) return;

    const newPosition = members.length;

    const { error } = await supabase.from("members").insert([
      {
        name,
        position: newPosition,
        count: 0,
        golden: 0,
        shield_misses: 0,
      },
    ]);

    if (error) {
      console.error("Fehler beim Einfügen:", error);
    }

    setName("");
    loadMembers();
  }

  // Nächster Zug (erste Person nach hinten)
  async function nextTurn() {
    if (members.length === 0) return;

    const first = members[0];

    // Ersten nach hinten setzen
    await supabase
      .from("members")
      .update({
        count: first.count + 1,
        position: members.length - 1,
      })
      .eq("id", first.id);

    // Alle anderen nach vorne verschieben
    for (let i = 1; i < members.length; i++) {
      await supabase
        .from("members")
        .update({ position: i - 1 })
        .eq("id", members[i].id);
    }

    loadMembers();
  }

  return (
    <div style={{ padding: 20, background: "#000", color: "#fff", minHeight: "100vh" }}>
      <h1 style={{ color: "#93c01f" }}>COO Allianz</h1>

      <div style={{ marginBottom: 20 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Spielername"
          style={{ padding: 8, marginRight: 10 }}
        />
        <button onClick={addMember}>Hinzufügen</button>
      </div>

      <button onClick={nextTurn} style={{ marginBottom: 20 }}>
        Nächster Zug
      </button>

      <ul>
        {members.map((m, i) => (
          <li key={m.id}>
            {i + 1}. {m.name} (Züge: {m.count})
          </li>
        ))}
      </ul>
    </div>
  );
}
