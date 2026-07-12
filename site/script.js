// 문의 수신 이메일 — 여기만 바꾸면 됩니다.
const CONTACT_EMAIL = "yaki27@gmail.com";

// 정적 사이트라 서버 없이 동작하도록, 폼 내용을 담아 메일 앱을 엽니다.
// Formspree 등 폼 수신 서비스로 바꾸려면 이 핸들러를 fetch(POST)로 교체하세요.
document.getElementById("contact-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = new FormData(e.target);
  const subject = `[YAKI STUDIO 문의] ${data.get("type")} - ${data.get("name")}`;
  const body = [
    `이름: ${data.get("name")}`,
    `이메일: ${data.get("email")}`,
    `문의 유형: ${data.get("type")}`,
    "",
    data.get("message"),
  ].join("\n");
  location.href =
    `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});

// 모바일 메뉴: 링크를 누르면 메뉴 닫기
document.querySelectorAll(".nav-links a").forEach((a) =>
  a.addEventListener("click", () => document.body.classList.remove("menu-open"))
);
