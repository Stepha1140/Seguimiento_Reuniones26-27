import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase.js";

const S = {
  page: { minHeight: "100vh", background: "#f4f7fb", color: "#172033", fontFamily: "Arial, sans-serif" },
  header: { background: "#fff", borderBottom: "1px solid #dbe2ea", padding: 20 },
  content: { maxWidth: 1150, margin: "0 auto", padding: 24 },
  row: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 18 },
  card: { background: "#fff", border: "1px solid #dbe2ea", borderRadius: 16, padding: 20, boxShadow: "0 6px 18px rgba(15,23,42,.06)" },
  input: { width: "100%", boxSizing: "border-box", marginTop: 6, padding: 11, border: "1px solid #b9c4d2", borderRadius: 10 },
  button: { border: 0, borderRadius: 10, padding: "11px 15px", cursor: "pointer", fontWeight: "bold" },
  primary: { background: "#2563eb", color: "#fff" },
  secondary: { background: "#fff", color: "#172033", border: "1px solid #b9c4d2" },
  danger: { background: "#fff1f2", color: "#be123c", border: "1px solid #fecdd3" },
  success: { background: "#ecfdf5", color: "#047857" },
  warning: { background: "#fff7ed", color: "#9a3412" },
  modalBg: { position: "fixed", inset: 0, zIndex: 20, background: "rgba(15,23,42,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 },
  modal: { width: "100%", maxWidth: 800, maxHeight: "92vh", overflowY: "auto", background: "#fff", borderRadius: 18, padding: 24 },
  block: { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 14 },
  message: { padding: 12, borderRadius: 10, marginBottom: 15 }
};

const ZONES = ["Metropolitana", "Suroccidente", "Suroriente", "Riomar", "Centro Histórico"];
const emptyLeader = { nombre: "", zona: "", telefono: "" };
const emptyMeeting = {
  tema: "", descripcion: "", fecha: "", lugar: "",
  personas_convocadas: "", personas_asistentes: "",
  entrego_premios: false, observaciones: ""
};

function prettyDate(value) {
  if (!value) return "Sin fecha";
  return new Date(value + "T00:00:00").toLocaleDateString("es-CO", {
    day: "2-digit", month: "long", year: "numeric"
  });
}

function safeName(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");
}

export default function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState("success");
  const [leaders, setLeaders] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [search, setSearch] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [modal, setModal] = useState("");
  const [selectedLeader, setSelectedLeader] = useState(null);
  const [leaderForm, setLeaderForm] = useState(emptyLeader);
  const [meetingForm, setMeetingForm] = useState(emptyMeeting);
  const [attendanceFile, setAttendanceFile] = useState(null);
  const [winnersFile, setWinnersFile] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [evidenceMeeting, setEvidenceMeeting] = useState(null);
  const [evidence, setEvidence] = useState([]);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session) loadData();
    else {
      setLeaders([]);
      setMeetings([]);
    }
  }, [session]);

  function showNotice(text, type = "success") {
    setNotice(text);
    setNoticeType(type);
  }

  async function signIn(event) {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) showNotice("No fue posible iniciar sesión: " + error.message, "danger");
    setSaving(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setEmail("");
    setPassword("");
  }

  async function loadData() {
    setLoading(true);
    const [leaderResult, meetingResult] = await Promise.all([
      supabase.from("lideres").select("*").order("nombre", { ascending: true }),
      supabase.from("reuniones").select("*").order("fecha", { ascending: false })
    ]);
    if (leaderResult.error) showNotice("Error consultando líderes: " + leaderResult.error.message, "danger");
    else setLeaders(leaderResult.data || []);
    if (meetingResult.error) showNotice("Error consultando reuniones: " + meetingResult.error.message, "danger");
    else setMeetings(meetingResult.data || []);
    setLoading(false);
  }

  async function saveLeader(event) {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    const { error } = await supabase.from("lideres").insert({
      nombre: leaderForm.nombre.trim(),
      zona: leaderForm.zona.trim(),
      telefono: leaderForm.telefono.trim(),
      estado: "Activo"
    });
    if (error) showNotice("No fue posible guardar el líder: " + error.message, "danger");
    else {
      setLeaderForm(emptyLeader);
      setModal("");
      showNotice("Líder registrado correctamente.");
      await loadData();
    }
    setSaving(false);
  }

  function openMeeting(leader) {
    setSelectedLeader(leader);
    setMeetingForm(emptyMeeting);
    setAttendanceFile(null);
    setWinnersFile(null);
    setPhotos([]);
    setNotice("");
    setModal("meeting");
  }

  async function uploadEvidence(file, meetingId, type) {
    if (!file) return;
    const path = `${session.user.id}/${meetingId}/${type}_${Date.now()}_${safeName(file.name)}`;
    const { error: uploadError } = await supabase.storage
      .from("evidencias-reuniones")
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (uploadError) throw uploadError;
    const { error: recordError } = await supabase.from("evidencias").insert({
      reunion_id: meetingId,
      tipo: type,
      nombre_archivo: file.name,
      ruta_archivo: path
    });
    if (recordError) throw recordError;
  }

  async function saveMeeting(event) {
    event.preventDefault();
    setNotice("");
    if (Number(meetingForm.personas_asistentes) > Number(meetingForm.personas_convocadas)) {
      showNotice("Las personas asistentes no pueden superar a las convocadas.", "danger");
      return;
    }
    if (meetingForm.entrego_premios && !winnersFile) {
      showNotice("Debe seleccionar el listado de personas premiadas.", "danger");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.from("reuniones").insert({
      lider_id: selectedLeader.id,
      tema: meetingForm.tema.trim(),
      descripcion: meetingForm.descripcion.trim(),
      fecha: meetingForm.fecha,
      lugar: meetingForm.lugar.trim(),
      personas_convocadas: Number(meetingForm.personas_convocadas),
      personas_asistentes: Number(meetingForm.personas_asistentes),
      entrego_premios: meetingForm.entrego_premios,
      observaciones: meetingForm.observaciones.trim()
    }).select().single();
    if (error) {
      showNotice("No fue posible guardar la reunión: " + error.message, "danger");
      setSaving(false);
      return;
    }
    try {
      await uploadEvidence(attendanceFile, data.id, "LISTA_ASISTENTES");
      await uploadEvidence(winnersFile, data.id, "LISTA_PREMIADOS");
      for (const photo of photos) await uploadEvidence(photo, data.id, "FOTOGRAFIA");
      setModal("");
      setMeetingForm(emptyMeeting);
      showNotice("Reunión y evidencias guardadas correctamente.");
      await loadData();
    } catch (fileError) {
      showNotice("La reunión fue creada, pero una evidencia no pudo cargarse: " + fileError.message, "warning");
      await loadData();
    }
    setSaving(false);
  }

  async function deleteLeader(id) {
    if (!window.confirm("¿Eliminar este líder y todas sus reuniones?")) return;
    const { error } = await supabase.from("lideres").delete().eq("id", id);
    if (error) showNotice("No fue posible eliminar el líder: " + error.message, "danger");
    else {
      showNotice("Líder eliminado.");
      await loadData();
    }
  }

  async function deleteMeeting(id) {
    if (!window.confirm("¿Eliminar esta reunión?")) return;
    const { error } = await supabase.from("reuniones").delete().eq("id", id);
    if (error) showNotice("No fue posible eliminar la reunión: " + error.message, "danger");
    else {
      showNotice("Reunión eliminada.");
      await loadData();
    }
  }

  async function viewEvidence(meeting) {
    setSaving(true);
    const { data, error } = await supabase.from("evidencias").select("*").eq("reunion_id", meeting.id).order("creado_en");
    if (error) {
      showNotice("No fue posible consultar evidencias: " + error.message, "danger");
      setSaving(false);
      return;
    }
    const items = await Promise.all((data || []).map(async (item) => {
      const result = await supabase.storage.from("evidencias-reuniones").createSignedUrl(item.ruta_archivo, 3600);
      return { ...item, enlace: result.data?.signedUrl || "" };
    }));
    setEvidenceMeeting(meeting);
    setEvidence(items);
    setModal("evidence");
    setSaving(false);
  }

  const filteredLeaders = useMemo(() => {
    const text = search.toLowerCase().trim();
    return leaders.filter((leader) => `${leader.nombre || ""} ${leader.zona || ""} ${leader.telefono || ""}`.toLowerCase().includes(text));
  }, [leaders, search]);

  const zonePerformance = useMemo(() => {
    const rows = ZONES.map((zone) => {
      const zoneLeaders = leaders.filter((leader) =>
        (leader.zona || "").trim().toLocaleLowerCase("es") === zone.toLocaleLowerCase("es")
      );
      const leaderIds = new Set(zoneLeaders.map((leader) => leader.id));
      const zoneMeetings = meetings.filter((meeting) =>
        leaderIds.has(meeting.lider_id) && Number(meeting.fecha.slice(0, 4)) === Number(year)
      );
      return {
        zona: zone,
        lideres: zoneLeaders.length,
        reuniones: zoneMeetings.length,
        convocados: zoneMeetings.reduce((sum, meeting) => sum + Number(meeting.personas_convocadas || 0), 0),
        asistentes: zoneMeetings.reduce((sum, meeting) => sum + Number(meeting.personas_asistentes || 0), 0)
      };
    });
    const totalAsistentes = rows.reduce((sum, row) => sum + row.asistentes, 0);
    return rows.map((row) => ({
      ...row,
      asistencia: row.convocados ? Math.round((row.asistentes / row.convocados) * 100) : 0,
      participacion: totalAsistentes ? Math.round((row.asistentes / totalAsistentes) * 100) : 0
    })).sort((a, b) => b.asistentes - a.asistentes);
  }, [leaders, meetings, year]);

  const topZone = zonePerformance[0];

  function meetingsForLeader(id) {
    return meetings.filter((meeting) => meeting.lider_id === id && Number(meeting.fecha.slice(0, 4)) === Number(year));
  }

  const noticeStyle = noticeType === "danger" ? S.danger : noticeType === "warning" ? S.warning : S.success;

  if (loading && !session) return <main style={S.page}><div style={S.content}>Cargando aplicación...</div></main>;

  if (!session) {
    return (
      <main style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <form style={{ ...S.card, width: "100%", maxWidth: 430 }} onSubmit={signIn}>
          <h1>Seguimiento de reuniones</h1>
          <p>Ingrese con una cuenta autorizada.</p>
          {notice && <p style={{ ...S.message, ...noticeStyle }}>{notice}</p>}
          <label>Correo electrónico<input required type="email" style={S.input} value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <br /><br />
          <label>Contraseña<input required type="password" style={S.input} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          <br /><br />
          <button style={{ ...S.button, ...S.primary, width: "100%" }} disabled={saving}>{saving ? "Ingresando..." : "Iniciar sesión"}</button>
        </form>
      </main>
    );
  }

  return (
    <div style={S.page}>
      <header style={S.header}>
        <div style={{ maxWidth: 1150, margin: "0 auto", ...S.row, justifyContent: "space-between" }}>
          <div><h1 style={{ margin: 0 }}>Seguimiento de reuniones</h1><p style={{ color: "#64748b", marginBottom: 0 }}>Líderes, reuniones y evidencias</p></div>
          <div style={S.row}>
            <button style={{ ...S.button, ...S.primary }} onClick={() => setModal("leader")}>+ Agregar líder</button>
            <button style={{ ...S.button, ...S.secondary }} onClick={() => setModal("performance")}>Rendimiento por zonas</button>
            <button style={{ ...S.button, ...S.secondary }} onClick={signOut}>Cerrar sesión</button>
          </div>
        </div>
      </header>

      <main style={S.content}>
        {notice && <p style={{ ...S.message, ...noticeStyle }}>{notice}</p>}
        <div style={{ ...S.card, ...S.row, marginBottom: 20 }}>
          <input style={{ ...S.input, flex: 1, minWidth: 230, marginTop: 0 }} placeholder="Buscar por nombre, zona o teléfono" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select style={{ ...S.input, width: 130, marginTop: 0 }} value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[2025, 2026, 2027, 2028].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        {loading ? <p>Cargando información...</p> : (
          <div style={S.grid}>
            {filteredLeaders.map((leader) => (
              <section key={leader.id} style={S.card}>
                <h2>{leader.nombre}</h2>
                <p><b>Zona:</b> {leader.zona || "Sin registrar"}</p>
                <p><b>Teléfono:</b> {leader.telefono || "Sin registrar"}</p>
                <p><b>Reuniones en {year}:</b> {meetingsForLeader(leader.id).length}</p>
                <div style={S.row}>
                  <button style={{ ...S.button, ...S.primary }} onClick={() => openMeeting(leader)}>Registrar reunión</button>
                  <button style={{ ...S.button, ...S.secondary }} onClick={() => { setSelectedLeader(leader); setModal("history"); }}>Ver reuniones</button>
                  <button style={{ ...S.button, ...S.danger }} onClick={() => deleteLeader(leader.id)}>Eliminar</button>
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {modal === "leader" && (
        <div style={S.modalBg}><form style={S.modal} onSubmit={saveLeader}>
          <h2>Agregar líder</h2>
          <label>Nombre completo *<input required style={S.input} value={leaderForm.nombre} onChange={(e) => setLeaderForm({ ...leaderForm, nombre: e.target.value })} /></label><br /><br />
          <label>Zona o sector *
            <select required style={S.input} value={leaderForm.zona} onChange={(e) => setLeaderForm({ ...leaderForm, zona: e.target.value })}>
              <option value="">Seleccione una zona</option>
              {ZONES.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
            </select>
          </label><br /><br />
          <label>Teléfono<input style={S.input} value={leaderForm.telefono} onChange={(e) => setLeaderForm({ ...leaderForm, telefono: e.target.value })} /></label><br /><br />
          <div style={S.row}><button type="button" style={{ ...S.button, ...S.secondary }} onClick={() => setModal("")}>Cancelar</button><button type="submit" style={{ ...S.button, ...S.primary }} disabled={saving}>{saving ? "Guardando..." : "Guardar líder"}</button></div>
        </form></div>
      )}

      {modal === "meeting" && selectedLeader && (
        <div style={S.modalBg}><form style={S.modal} onSubmit={saveMeeting}>
          <h2>Registrar reunión y evidencias</h2><p><b>Líder:</b> {selectedLeader.nombre}</p>
          {notice && <p style={{ ...S.message, ...noticeStyle }}>{notice}</p>}
          <label>Tema de la reunión *<input required style={S.input} value={meetingForm.tema} onChange={(e) => setMeetingForm({ ...meetingForm, tema: e.target.value })} /></label><br /><br />
          <label>Breve descripción de la actividad *<textarea required rows="4" style={S.input} value={meetingForm.descripcion} onChange={(e) => setMeetingForm({ ...meetingForm, descripcion: e.target.value })} /></label><br /><br />
          <div style={S.row}>
            <label style={{ flex: 1 }}>Fecha *<input required type="date" style={S.input} value={meetingForm.fecha} onChange={(e) => setMeetingForm({ ...meetingForm, fecha: e.target.value })} /></label>
            <label style={{ flex: 1 }}>Lugar<input style={S.input} value={meetingForm.lugar} onChange={(e) => setMeetingForm({ ...meetingForm, lugar: e.target.value })} /></label>
          </div><br />
          <div style={S.row}>
            <label style={{ flex: 1 }}>Personas convocadas *<input required min="0" type="number" style={S.input} value={meetingForm.personas_convocadas} onChange={(e) => setMeetingForm({ ...meetingForm, personas_convocadas: e.target.value })} /></label>
            <label style={{ flex: 1 }}>Personas asistentes *<input required min="0" type="number" style={S.input} value={meetingForm.personas_asistentes} onChange={(e) => setMeetingForm({ ...meetingForm, personas_asistentes: e.target.value })} /></label>
          </div><br />
          <div style={S.block}><b>Listado Excel de asistentes</b><p>Formatos XLSX, XLS o CSV.</p><input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setAttendanceFile(e.target.files?.[0] || null)} />{attendanceFile && <p>Seleccionado: <b>{attendanceFile.name}</b></p>}</div><br />
          <div style={S.block}><b>Registro fotográfico</b><p>Puede seleccionar varias fotografías.</p><input type="file" accept="image/*" multiple onChange={(e) => setPhotos(Array.from(e.target.files || []))} />{photos.length > 0 && <p>Fotografías seleccionadas: <b>{photos.length}</b></p>}</div><br />
          <div style={S.block}>
            <label><input type="checkbox" checked={meetingForm.entrego_premios} onChange={(e) => { setMeetingForm({ ...meetingForm, entrego_premios: e.target.checked }); if (!e.target.checked) setWinnersFile(null); }} /> <b>Se entregaron premios</b></label>
            {meetingForm.entrego_premios && <div style={{ marginTop: 15 }}><p>Listado Excel de personas premiadas.</p><input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setWinnersFile(e.target.files?.[0] || null)} />{winnersFile && <p>Seleccionado: <b>{winnersFile.name}</b></p>}</div>}
          </div><br />
          <label>Observaciones<textarea rows="3" style={S.input} value={meetingForm.observaciones} onChange={(e) => setMeetingForm({ ...meetingForm, observaciones: e.target.value })} /></label><br /><br />
          <div style={S.row}><button type="button" style={{ ...S.button, ...S.secondary }} onClick={() => setModal("")}>Cancelar</button><button type="submit" style={{ ...S.button, ...S.primary }} disabled={saving}>{saving ? "Guardando..." : "Guardar reunión"}</button></div>
        </form></div>
      )}

      {modal === "history" && selectedLeader && (
        <div style={S.modalBg}><div style={S.modal}>
          <div style={{ ...S.row, justifyContent: "space-between" }}><h2>Reuniones de {selectedLeader.nombre}</h2><button style={{ ...S.button, ...S.secondary }} onClick={() => setModal("")}>Cerrar</button></div>
          <p>Historial correspondiente a {year}</p>
          {meetingsForLeader(selectedLeader.id).length === 0 && <p style={S.block}>No hay reuniones registradas.</p>}
          {meetingsForLeader(selectedLeader.id).map((item) => (
            <article key={item.id} style={{ ...S.card, marginBottom: 15 }}>
              <h3>{item.tema}</h3><p>{prettyDate(item.fecha)} | {item.lugar || "Sin lugar"}</p><p><b>Descripción:</b> {item.descripcion}</p>
              <div style={S.row}><div style={{ ...S.block, flex: 1 }}><small>CONVOCADOS</small><h2>{item.personas_convocadas}</h2></div><div style={{ ...S.block, ...S.success, flex: 1 }}><small>ASISTIERON</small><h2>{item.personas_asistentes}</h2></div></div>
              <p><b>Premios:</b> {item.entrego_premios ? "Sí" : "No"}</p>{item.observaciones && <p><b>Observaciones:</b> {item.observaciones}</p>}
              <div style={S.row}><button style={{ ...S.button, ...S.secondary }} onClick={() => viewEvidence(item)}>Ver evidencias</button><button style={{ ...S.button, ...S.danger }} onClick={() => deleteMeeting(item.id)}>Eliminar reunión</button></div>
            </article>
          ))}
        </div></div>
      )}

      {modal === "performance" && (
        <div style={S.modalBg}><div style={{ ...S.modal, maxWidth: 1050 }}>
          <div style={{ ...S.row, justifyContent: "space-between" }}>
            <div><h2 style={{ marginBottom: 4 }}>Rendimiento por zonas</h2><p style={{ marginTop: 0, color: "#64748b" }}>Participación territorial correspondiente a {year}</p></div>
            <button style={{ ...S.button, ...S.secondary }} onClick={() => setModal("")}>Cerrar</button>
          </div>
          <div style={{ ...S.block, ...S.success, marginBottom: 18 }}>
            <b>Zona con mayor participación:</b>{" "}
            {topZone && topZone.asistentes > 0 ? `${topZone.zona}, con ${topZone.asistentes} asistentes y ${topZone.participacion}% del total registrado.` : "Aún no hay reuniones con asistencia registrada en el año seleccionado."}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
              <thead><tr style={{ background: "#eff6ff", textAlign: "left" }}>
                {["Zona", "Líderes", "Reuniones", "Convocados", "Asistentes", "Asistencia", "Peso territorial"].map((label) => <th key={label} style={{ padding: 12, borderBottom: "1px solid #cbd5e1" }}>{label}</th>)}
              </tr></thead>
              <tbody>{zonePerformance.map((row) => (
                <tr key={row.zona}>
                  <td style={{ padding: 12, borderBottom: "1px solid #e2e8f0", fontWeight: 700 }}>{row.zona}</td>
                  <td style={{ padding: 12, borderBottom: "1px solid #e2e8f0" }}>{row.lideres}</td>
                  <td style={{ padding: 12, borderBottom: "1px solid #e2e8f0" }}>{row.reuniones}</td>
                  <td style={{ padding: 12, borderBottom: "1px solid #e2e8f0" }}>{row.convocados}</td>
                  <td style={{ padding: 12, borderBottom: "1px solid #e2e8f0" }}>{row.asistentes}</td>
                  <td style={{ padding: 12, borderBottom: "1px solid #e2e8f0" }}>{row.asistencia}%</td>
                  <td style={{ padding: 12, borderBottom: "1px solid #e2e8f0", minWidth: 150 }}>
                    <b>{row.participacion}%</b>
                    <div style={{ height: 8, marginTop: 6, background: "#e2e8f0", borderRadius: 8 }}><div style={{ height: 8, width: `${row.participacion}%`, background: "#2563eb", borderRadius: 8 }} /></div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <p style={{ marginTop: 16, color: "#64748b", fontSize: 13 }}>Peso territorial = asistentes registrados en la zona dividido entre asistentes registrados en las cinco zonas. Este indicador representa participación en reuniones.</p>
        </div></div>
      )}

      {modal === "evidence" && evidenceMeeting && (
        <div style={S.modalBg}><div style={S.modal}>
          <div style={{ ...S.row, justifyContent: "space-between" }}><h2>Evidencias de la reunión</h2><button style={{ ...S.button, ...S.secondary }} onClick={() => setModal("history")}>Regresar</button></div>
          <h3>{evidenceMeeting.tema}</h3>
          {evidence.length === 0 && <p style={S.block}>Esta reunión no tiene evidencias.</p>}
          {evidence.map((item) => <div key={item.id} style={{ ...S.block, marginBottom: 12 }}><p><b>Tipo:</b> {item.tipo}</p><p><b>Archivo:</b> {item.nombre_archivo}</p>{item.enlace && <a href={item.enlace} target="_blank" rel="noreferrer">Abrir o descargar evidencia</a>}</div>)}
        </div></div>
      )}
    </div>
  );
}
