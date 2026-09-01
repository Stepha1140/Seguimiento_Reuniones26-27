import React from "react";

export default function App() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        color: "#172033",
        fontFamily: "Arial, sans-serif",
        padding: "40px 20px"
      }}
    >
      <section
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          background: "white",
          border: "1px solid #dbe2ea",
          borderRadius: "18px",
          padding: "30px"
        }}
      >
        <h1>Seguimiento de reuniones</h1>
        <p>La aplicación fue publicada correctamente.</p>

        <div
          style={{
            marginTop: "24px",
            padding: "18px",
            background: "#eff6ff",
            borderRadius: "12px",
            color: "#1e40af"
          }}
        >
          Próximo paso: conectar la aplicación con Supabase.
        </div>
      </section>
    </main>
  );
}
