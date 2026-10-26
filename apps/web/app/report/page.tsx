"use client";
import { useEffect, useState } from "react";
import type { Credentials, Report } from "@quiz/contracts";
import { API } from "../../lib/client";
export default function ReportPage() {
  const [report, setReport] = useState<Report | null>(null),
    [error, setError] = useState("");
  function auth(): Credentials {
    const id = new URLSearchParams(window.location.search).get("room");
    const c = JSON.parse(localStorage.getItem(`room:${id}`) ?? "null");
    if (!c) throw new Error("Kein Host-Zugang auf diesem Gerät.");
    return c;
  }
  async function get(csv = false) {
    const c = auth();
    const res = await fetch(
      `${API}/rooms/${c.roomId}/report${csv ? ".csv" : ""}`,
      { headers: { Authorization: `Bearer ${c.token}` } },
    );
    if (!res.ok) {
      const body = await res.json();
      throw new Error(body.message);
    }
    return res;
  }
  useEffect(() => {
    void get()
      .then((r) => r.json())
      .then(setReport)
      .catch((e) => setError(e.message));
  }, []);
  async function download() {
    try {
      const r = await get(true);
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = "quizbericht.csv";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <main>
      <div className="eyebrow">GEMEINSAM GELERNT</div>
      <h1>Ergebnisbericht</h1>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {report && (
        <>
          <h2>{report.title}</h2>
          <p>
            {report.players.length} Personen · {report.questions.length} Fragen
          </p>
          <button onClick={() => void download()}>CSV herunterladen</button>
          <section className="card">
            <h2>Fragen im Überblick</h2>
            {report.questions.map((q, i) => (
              <div className="question-result" key={i}>
                <h3>
                  {i + 1}. {q.text}
                </h3>
                <p>
                  Richtig: {q.correctAnswer} · {q.correct} von{" "}
                  {report.players.length} richtig · {q.answered} Antworten
                </p>
                <progress
                  value={q.correct}
                  max={report.players.length || 1}
                  aria-label={`Richtige Antworten Frage ${i + 1}`}
                />
                <p>
                  Verteilung:{" "}
                  {q.distribution
                    .map((n, j) => `Option ${j + 1}: ${n}`)
                    .join(" · ")}
                </p>
              </div>
            ))}
          </section>
          <section className="card">
            <h2>Antwortdetails</h2>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Frage</th>
                    <th>Antwort</th>
                    <th>Punkte</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((r, i) => (
                    <tr key={i}>
                      <td>{r.name}</td>
                      <td>{r.question}</td>
                      <td>
                        {r.answer} {r.correct ? "✓" : "–"}
                      </td>
                      <td>{r.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
