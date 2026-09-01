import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase.js";

const estilos = {
  pagina: {
    minHeight: "100vh",
    background: "#f4f7fb",
    color: "#172033",
    fontFamily: "Arial, sans-serif"
  },
  encabezado: {
    background: "#ffffff",
    borderBottom: "1px solid #dbe2ea",
    padding: "20px"
  },
  contenido: {
    maxWidth: "1150px",
    margin: "0 auto",
    padding: "24px"
  },
  fila: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "12px"
  },
  rejilla: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
    gap: "18px"
  },
  tarjeta: {
    background: "#ffffff",
    border: "1px solid #dbe2ea",
    borderRadius: "16px",
    padding: "20px",
    boxShadow: "0 6px 18px rgba(15, 23, 42, 0.06)"
  },
  campo: {
    width: "100%",
    boxSizing: "border-box",
    marginTop: "6px",
    padding: "11px",
    border: "1px solid #b9c4d2",
    borderRadius: "10px"
  },
  boton: {
    border: "0",
    borderRadius: "10px",
    padding: "11px 15px",
    cursor: "pointer",
    fontWeight: "bold"
  },
  azul: {
    background: "#2563eb",
    color: "#ffffff"
  },
  blanco: {
    background: "#ffffff",
    color: "#172033",
    border: "1px solid #b9c4d2"
  },
  rojo: {
    background: "#fff1f2",
    color: "#be123c",
    border: "1px solid #fecdd3"
  },
  verde: {
    background: "#ecfdf5",
    color: "#047857"
  },
  amarillo: {
    background: "#fff7ed",
    color: "#9a3412"
  },
  modalFondo: {
    position: "fixed",
    inset: 0,
    zIndex: 20,
    background: "rgba(15, 23, 42, 0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px"
  },
  modal: {
    width: "100%",
    maxWidth: "800px",
    maxHeight: "92vh",
    overflowY: "auto",
    background: "#ffffff",
    borderRadius: "18px",
    padding: "24px"
  },
  bloque: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "14px"
  },
  mensaje: {
    padding: "12px",
    borderRadius: "10px",
    marginBottom: "15px"
  }
};

const liderVacio = {
  nombre: "",
  zona: "",
  telefono: ""
};

const reunionVacia = {
  tema: "",
  descripcion: "",
  fecha: "",
  lugar: "",
  personas_convocadas: "",
  personas_asistentes: "",
  entrego_premios: false,
  observaciones: ""
};

function fechaBonita(fecha) {
  if (!fecha) return "Sin fecha";

  return new Date(fecha + "T00:00:00").toLocaleDateString(
    "es-CO",
    {
      day: "2-digit",
      month: "long",
      year: "numeric"
    }
  );
}

function nombreSeguro(nombre) {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}

export default function App() {
  const [sesion, setSesion] = useState(null);
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState("verde");

  const [lideres, setLideres] = useState([]);
  const [reuniones, setReuniones] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [anio, setAnio] = useState(new Date().getFullYear());

  const [modal, setModal] = useState("");
  const [liderSeleccionado, setLiderSeleccionado] =
    useState(null);

  const [formLider, setFormLider] =
    useState(liderVacio);

  const [formReunion, setFormReunion] =
    useState(reunionVacia);

  const [listaAsistentes, setListaAsistentes] =
    useState(null);

  const [listaPremiados, setListaPremiados] =
    useState(null);

  const [fotografias, setFotografias] =
    useState([]);

  useEffect(() => {
    verificarSesion();

    const { data } = supabase.auth.onAuthStateChange(
      (_evento, nuevaSesion) => {
        setSesion(nuevaSesion);

        if (nuevaSesion) {
          cargarDatos();
        }
      }
    );

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  async function verificarSesion() {
    const { data } = await supabase.auth.getSession();

    setSesion(data.session);

    if (data.session) {
      await cargarDatos();
    }

    setCargando(false);
  }

  function mostrarMensaje(texto, tipo = "verde") {
    setMensaje(texto);
    setTipoMensaje(tipo);
  }

  async function iniciarSesion(evento) {
    evento.preventDefault();
    setGuardando(true);
    setMensaje("");

    const { error } =
      await supabase.auth.signInWithPassword({
        email: correo,
        password: contrasena
      });

    if (error) {
      mostrarMensaje(
        "No fue posible iniciar sesión: " +
          error.message,
        "rojo"
      );
    }

    setGuardando(false);
  }

  async function cerrarSesion() {
    await supabase.auth.signOut();

    setSesion(null);
    setLideres([]);
    setReuniones([]);
    setCorreo("");
    setContrasena("");
  }

  async function cargarDatos() {
    setCargando(true);

    const resultadoLideres = await supabase
      .from("lideres")
      .select("*")
      .order("nombre", { ascending: true });

    const resultadoReuniones = await supabase
      .from("reuniones")
      .select("*")
      .order("fecha", { ascending: false });

    if (resultadoLideres.error) {
      mostrarMensaje(
        "Error consultando líderes: " +
          resultadoLideres.error.message,
        "rojo"
      );
    } else {
      setLideres(resultadoLideres.data || []);
    }

    if (resultadoReuniones.error) {
      mostrarMensaje(
        "Error consultando reuniones: " +
          resultadoReuniones.error.message,
        "rojo"
      );
    } else {
      setReuniones(resultadoReuniones.data || []);
    }

    setCargando(false);
  }

  async function guardarLider(evento) {
    evento.preventDefault();
    setGuardando(true);
    setMensaje("");

    const { error } = await supabase
      .from("lideres")
      .insert({
        nombre: formLider.nombre.trim(),
        zona: formLider.zona.trim(),
        telefono: formLider.telefono.trim(),
        estado: "Activo"
      });

    if (error) {
      mostrarMensaje(
        "No fue posible guardar el líder: " +
          error.message,
        "rojo"
      );
    } else {
      mostrarMensaje(
        "El líder fue registrado correctamente."
      );

      setFormLider(liderVacio);
      setModal("");
      await cargarDatos();
    }

    setGuardando(false);
  }

  function abrirFormularioReunion(lider) {
    setLiderSeleccionado(lider);
    setFormReunion(reunionVacia);
    setListaAsistentes(null);
    setListaPremiados(null);
    setFotografias([]);
    setMensaje("");
    setModal("reunion");
  }

  async function subirArchivo(
    archivo,
    reunionId,
    tipo
  ) {
    if (!archivo) return null;

    const ruta =
      sesion.user.id +
      "/" +
      reunionId +
      "/" +
      tipo +
      "_" +
      Date.now() +
      "_" +
      nombreSeguro(archivo.name);

    const { error: errorCarga } = await supabase
      .storage
      .from("evidencias-reuniones")
      .upload(ruta, archivo, {
        cacheControl: "3600",
        upsert: false
      });

    if (errorCarga) {
      throw new Error(errorCarga.message);
    }

    const { error: errorRegistro } = await supabase
      .from("evidencias")
      .insert({
        reunion_id: reunionId,
        tipo,
        nombre_archivo: archivo.name,
        ruta_archivo: ruta
      });

    if (errorRegistro) {
      throw new Error(errorRegistro.message);
    }

    return ruta;
  }

  async function guardarReunion(evento) {
    evento.preventDefault();
    setMensaje("");

    if (
      Number(formReunion.personas_asistentes) >
      Number(formReunion.personas_convocadas)
    ) {
      mostrarMensaje(
        "Las personas asistentes no pueden superar a las convocadas.",
        "rojo"
      );
      return;
    }

    if (
      formReunion.entrego_premios &&
      !listaPremiados
    ) {
      mostrarMensaje(
        "Debe seleccionar el listado de personas premiadas.",
        "rojo"
      );
      return;
    }

    setGuardando(true);

    const { data: reunionCreada, error } =
      await supabase
        .from("reuniones")
        .insert({
          lider_id: liderSeleccionado.id,
          tema: formReunion.tema.trim(),
          descripcion: formReunion.descripcion.trim(),
          fecha: formReunion.fecha,
          lugar: formReunion.lugar.trim(),
          personas_convocadas: Number(
            formReunion.personas_convocadas
          ),
          personas_asistentes: Number(
            formReunion.personas_asistentes
          ),
          entrego_premios:
            formReunion.entrego_premios,
          observaciones:
            formReunion.observaciones.trim()
        })
        .select()
        .single();

    if (error) {
      mostrarMensaje(
        "No fue posible guardar la reunión: " +
          error.message,
        "rojo"
      );

      setGuardando(false);
      return;
    }

    try {
      if (listaAsistentes) {
        await subirArchivo(
          listaAsistentes,
          reunionCreada.id,
          "LISTA_ASISTENTES"
        );
      }

      if (listaPremiados) {
        await subirArchivo(
          listaPremiados,
          reunionCreada.id,
          "LISTA_PREMIADOS"
        );
      }

      for (const fotografia of fotografias) {
        await subirArchivo(
          fotografia,
          reunionCreada.id,
          "FOTOGRAFIA"
        );
      }

      mostrarMensaje(
        "La reunión y sus evidencias fueron guardadas correctamente."
      );

      setFormReunion(reunionVacia);
      setListaAsistentes(null);
      setListaPremiados(null);
      setFotografias([]);
      setModal("");
      await cargarDatos();
    } catch (errorArchivo) {
      mostrarMensaje(
        "La reunión fue creada, pero ocurrió un problema cargando una evidencia: " +
          errorArchivo.message,
        "amarillo"
      );
    }

    setGuardando(false);
  }

  async function eliminarLider(id) {
    const confirmar = window.confirm(
      "¿Desea eliminar este líder y todas sus reuniones?"
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("lideres")
      .delete()
      .eq("id", id);

    if (error) {
      mostrarMensaje(
        "No fue posible eliminar el líder: " +
          error.message,
        "rojo"
      );
    } else {
      mostrarMensaje("El líder fue eliminado.");
      await cargarDatos();
    }
  }

  async function eliminarReunion(id) {
    const confirmar = window.confirm(
      "¿Desea eliminar esta reunión?"
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("reuniones")
      .delete()
      .eq("id", id);

    if (error) {
      mostrarMensaje(
        "No fue posible eliminar la reunión: " +
          error.message,
        "rojo"
      );
    } else {
      mostrarMensaje("La reunión fue eliminada.");
      await cargarDatos();
    }
  }

  async function verEvidencias(reunion) {
    setGuardando(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("evidencias")
      .select("*")
      .eq("reunion_id", reunion.id)
      .order("creado_en", { ascending: true });

    if (error) {
      mostrarMensaje(
        "No fue posible consultar las evidencias: " +
          error.message,
        "rojo"
      );

      setGuardando(false);
      return;
    }

    const archivosConEnlace = [];

    for (const evidencia of data || []) {
      const resultado = await supabase
        .storage
        .from("evidencias-reuniones")
        .createSignedUrl(
          evidencia.ruta_archivo,
          3600
        );

      archivosConEnlace.push({
        ...evidencia,
        enlace: resultado.data
          ? resultado.data.signedUrl
          : ""
      });
    }

    setLiderSeleccionado({
      ...liderSeleccionado,
      reunionActual: reunion,
      evidenciasActuales: archivosConEnlace
    });

    setModal("evidencias");
    setGuardando(false);
  }

  const lideresFiltrados = useMemo(() => {
    const texto = busqueda.toLowerCase().trim();

    return lideres.filter((lider) => {
      const contenido =
        (lider.nombre || "") +
        " " +
        (lider.zona || "") +
        " " +
        (lider.telefono || "");

      return contenido.toLowerCase().includes(texto);
    });
  }, [lideres, busqueda]);

  function reunionesDelLider(liderId) {
    return reuniones.filter((reunion) => {
      return (
        reunion.lider_id === liderId &&
        Number(reunion.fecha.slice(0, 4)) ===
          Number(anio)
      );
    });
  }

  if (cargando && !sesion) {
    return (
      <main style={estilos.pagina}>
        <div style={estilos.contenido}>
          <p>Cargando aplicación...</p>
        </div>
      </main>
    );
  }

  if (!sesion) {
    return (
      <main
        style={{
          ...estilos.pagina,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px"
        }}
      >
        <form
          style={{
            ...estilos.tarjeta,
            width: "100%",
            maxWidth: "430px"
          }}
          onSubmit={iniciarSesion}
        >
          <h1>Seguimiento de reuniones</h1>

          <p>Ingrese con una cuenta autorizada.</p>

          {mensaje && (
            <p
              style={{
                ...estilos.mensaje,
                ...estilos[tipoMensaje]
              }}
            >
              {mensaje}
            </p>
          )}

          <label>
            Correo electrónico
            <input
              required
              type="email"
              style={estilos.campo}
              value={correo}
              onChange={(evento) =>
                setCorreo(evento.target.value)
              }
            />
          </label>

          <br />
          <br />

          <label>
            Contraseña
            <input
              required
              type="password"
              style={estilos.campo}
              value={contrasena}
              onChange={(evento) =>
                setContrasena(evento.target.value)
              }
            />
          </label>

          <br />
          <br />

          <button
            style={{
              ...estilos.boton,
              ...estilos.azul,
              width: "100%"
            }}
            disabled={guardando}
          >
            {guardando
              ? "Ingresando..."
              : "Iniciar sesión"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <div style={estilos.pagina}>
      <header style={estilos.encabezado}>
        <div
          style={{
            maxWidth: "1150px",
            margin: "0 auto",
            ...estilos.fila,
            justifyContent: "space-between"
          }}
        >
          <div>
            <h1 style={{ margin: 0 }}>
              Seguimiento de reuniones
            </h1>

            <p
              style={{
                color: "#64748b",
                marginBottom: 0
              }}
            >
              Líderes, reuniones y evidencias
            </p>
          </div>

          <div style={estilos.fila}>
            <button
              style={{
                ...estilos.boton,
                ...estilos.azul
              }}
              onClick={() => setModal("lider")}
            >
              + Agregar líder
            </button>

            <button
              style={{
                ...estilos.boton,
                ...estilos.blanco
              }}
              onClick={cerrarSesion}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main style={estilos.contenido}>
        {mensaje && (
          <p
            style={{
              ...estilos.mensaje,
              ...estilos[tipoMensaje]
            }}
          >
            {mensaje}
          </p>
        )}

        <div
          style={{
            ...estilos.tarjeta,
            ...estilos.fila,
            marginBottom: "20px"
          }}
        >
          <input
            style={{
              ...estilos.campo,
              flex: 1,
              minWidth: "230px",
              marginTop: 0
            }}
            placeholder="Buscar por nombre, zona o teléfono"
            value={busqueda}
            onChange={(evento) =>
              setBusqueda(evento.target.value)
            }
          />

          <select
            style={{
              ...estilos.campo,
              width: "130px",
              marginTop: 0
            }}
            value={anio}
            onChange={(evento) =>
              setAnio(Number(evento.target.value))
            }
          >
            <option value="2025">2025</option>
            <option value="2026">2026</option>
            <option value="2027">2027</option>
            <option value="2028">2028</option>
          </select>
        </div>

        {cargando ? (
          <p>Cargando información...</p>
        ) : (
          <div style={estilos.rejilla}>
            {lideresFiltrados.map((lider) => {
              const reunionesLider =
                reunionesDelLider(lider.id);

              return (
                <section
                  key={lider.id}
                  style={estilos.tarjeta}
                >
                  <h2>{lider.nombre}</h2>

                  <p>
                    <b>Zona:</b>{" "}
                    {lider.zona || "Sin registrar"}
                  </p>

                  <p>
                    <b>Teléfono:</b>{" "}
                    {lider.telefono || "Sin registrar"}
                  </p>

                  <p>
                    <b>Reuniones en {anio}:</b>{" "}
                    {reunionesLider.length}
                  </p>

                  <div style={estilos.fila}>
                    <button
                      style={{
                        ...estilos.boton,
                        ...estilos.azul
                      }}
                      onClick={() =>
                        abrirFormularioReunion(lider)
                      }
            
