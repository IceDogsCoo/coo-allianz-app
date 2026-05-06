import React, { useState } from "react";

export default function App() {
  const [members, setMembers] = useState([]);
  const [name, setName] = useState("");

  const addMember = () => {
    if (!name) return;
    setMembers([...members, { name, count: 0 }]);
    setName("");
  };

  const nextTurn = () => {
    if (members.length === 0) return;
    const first = members[0];
    first.count += 1;
    setMembers([...members.slice(1), first]);
  };

  return (
    <div style={{ padding: 20, fontFamily: "Arial", background: "#000", color: "#fff", minHeight: "100vh" }}>
      <h1 style={{ color: "#93c01f" }}>COO Allianz</h1>

      <div style={{ marginBottom: 20 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name eingeben"
          style={{ padding: 10, marginRight: 10 }}
        />
        <button onClick={addMember}>Hinzufügen</button>
      </div>

      <button onClick={nextTurn} style={{ marginBottom: 20 }}>
        Nächster Zug
      </button>

      <ul>
        {members.map((m, i) => (
          <li key={i}>
            {i + 1}. {m.name} (Züge: {m.count})
          </li>
        ))}
      </ul>
    </div>
  );
}
