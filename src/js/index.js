document.addEventListener("DOMContentLoaded", function () {
  const elementosAnimados = document.querySelectorAll("[data-animado]");

  const observer = new IntersectionObserver((entradas) => {
    entradas.forEach((entrada) => {
      if (entrada.isIntersecting) {
        entrada.target.classList.add("ativo");
        observer.unobserve(entrada.target);
      }
    });
  }, {
    threshold: 0.1
  });

  elementosAnimados.forEach((el) => observer.observe(el));

  // Feedback do formulário
  const form = document.querySelector("form");
  form.addEventListener("submit", function (e) {
    e.preventDefault(); // Evita o comportamento padrão
    const formData = new FormData(form);

    fetch(form.action, {
      method: form.method,
      body: formData,
      headers: {
        Accept: "application/json",
      },
    })
      .then((response) => {
        if (response.ok) {
          alert("Mensagem enviada com sucesso!");
          form.reset();
        } else {
          alert("Ocorreu um erro ao enviar sua mensagem. Tente novamente.");
        }
      })
      .catch(() => {
        alert("Ocorreu um erro ao enviar sua mensagem. Tente novamente.");
      });
  });
});
