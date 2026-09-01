import React, { useEffect, useState } from "react";
import { supabase } from "./supabase.js";

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f5f7fb",
    fontFamily: "Arial, sans-serif",
    color: "#172033",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px"
  },
  card: {
    width: "100%",
    maxWidth: "430px",
    background: "white",
    border: "1px solid #dbe2ea",
    borderRadius: "18px",
    padding: "28px",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)"
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px",
    marginTop: "6px",
    border: "1px solid #b9c4d2",
    borderRadius: "10px"
  },
  button: {
    width: "100%",
    padding: "12px",
    border: "0",
    borderRadius: "10px",
    background: "#2563eb",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer"
  },
  message: {
    padding: "12px",
    borderRadius: "9px",
    background: "#eff6ff",
    color: "#1e40af"
  },
  error: {
    padding: "12px",
    borderRadius: "9px",
    background: "#fff1f2",
    color: "#be123c"
  }
};

export default function App() {
  const [session, setSession] = useState(null);
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: listener } =
      supabase.auth.onAuthStateChange((_event, nuevaSession) => {
        setSession(nuevaSession);
      });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function iniciarSesion(evento) {
    evento.preventDefault();
    setCargando(true);
    setMensaje("");

    const { error } = await supabase.auth.signInWithPassword({
      email: correo,
      password: contrasena
    });

    if (error) {
      setMensaje("No fue posible iniciar sesión: " + error.message);
    }

    setCargando(false);
  }

  async function cerrarSesion() {
    await supabase.auth.signOut();
  }

  if (session) {
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <h1>Seguimiento de reuniones</h1>

          <div style={styles.message}>
            Conexión con Supabase realizada correctamente.
          </div>

          <p>
            Sesión iniciada como:
          </p>

          <p>
            <strong>{session.user.email}</strong>
          </p>

          <p>
            El próximo paso será habilitar el registro de líderes,
            reuniones y evidencias.
          </p>

          <button style={styles.button} onClick={cerrarSesion}>
            Cerrar sesión
          </button>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <form style={styles.card} onSubmit={iniciarSesion}>
        <h1>Seguimiento de reuniones</h1>

        <p>
          Ingrese con una cuenta autorizada.
        </p>

        {mensaje && (
          <p style={styles.error}>{mensaje}</p>
        )}

        <label>
          Correo electrónico
          <input
            required
            type="email"
            style={styles.input}
            value={correo}
            onChange={(evento) => setCorreo(evento.target.value)}
          />
        </label>

        <br />
        <br />

        <label>
          Contraseña
          <input
            required
            type="password"
            style={styles.input}
            value={contrasena}
            onChange={(evento) => setContrasena(evento.target.value)}
          />
        </label>

        <br />
        <br />

        <button
          style={styles.button}
          type="submit"
          disabled={cargando}
        >
          {cargando ? "Ingresando..." : "Iniciar sesión"}
        </button>
      </form>
    </main>
  );
}
