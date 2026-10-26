"use client";
import { useEffect, useState } from "react";
import { request } from "../lib/client";
export default function Sharing({ id }: { id: string }) {
  const [groups, setGroups] = useState<
      { id: string; name: string; role: string }[]
    >([]),
    [shares, setShares] = useState<{ id: string; name: string }[]>([]),
    [selected, setSelected] = useState(""),
    [error, setError] = useState("");
  async function load() {
    setShares(await request(`/quizzes/${id}/shares`));
    setGroups(
      (
        await request<{ id: string; name: string; role: string }[]>("/groups")
      ).filter((g) => g.role === "owner"),
    );
  }
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, [id]);
  async function run(fn: () => Promise<unknown>) {
    try {
      setError("");
      await fn();
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <section className="card">
      <h2>Für Gruppen freigeben</h2>
      <p>
        Bearbeiter dürfen ändern und veröffentlichen. Betrachter dürfen ansehen
        und spielen.
      </p>
      {error && <p role="alert">{error}</p>}
      <label>
        Gruppe
        <select
          aria-label="Gruppe"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">Gruppe auswählen</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </label>
      <button
        disabled={!selected}
        onClick={() =>
          void run(() =>
            request(`/quizzes/${id}/shares`, { groupId: selected }),
          )
        }
      >
        Freigeben
      </button>
      <ul>
        {shares.map((g) => (
          <li key={g.id}>
            {g.name}{" "}
            <button
              className="secondary small"
              onClick={() =>
                void run(() =>
                  request(`/quizzes/${id}/shares/${g.id}`, undefined, "DELETE"),
                )
              }
            >
              Freigabe entfernen
            </button>
          </li>
        ))}
      </ul>
      <a href="/groups">Gruppen verwalten</a>
    </section>
  );
}
