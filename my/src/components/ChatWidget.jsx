import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Icon from "./Icon";
import { useApp } from "../context/AppContext";
import { CONTACTS } from "../data/contacts";

// Keywords in all three languages → answer key in locales (chat.answers.*).
const TOPICS = [
  ["price", ["цена", "стоим", "сколько", "дорог", "price", "cost", "how much", "expensive", "баа", "канча", "акча", "кымбат"]],
  ["season", ["сезон", "когда", "погод", "season", "when", "weather", "best time", "мезгил", "качан", "аба ырайы", "убакыт"]],
  ["payment", ["оплат", "плат", "карт", "pay", "card", "төлө", "карта"]],
  ["booking", ["брон", "заказ", "book", "reserv", "order", "брондо", "заказ"]],
  ["cancel", ["отмен", "вернуть", "возврат", "cancel", "refund", "жокко", "кайтар"]],
  ["contact", ["телефон", "контакт", "связ", "phone", "contact", "call", "байланыш", "номер"]],
  ["kids", ["дет", "ребен", "семь", "kid", "child", "family", "бала", "үй-бүлө"]],
];

// Words that point to a specific tour (RU / KY / EN spellings).
const TOUR_WORDS = {
  "issyk-kul": ["иссык", "ысык", "issyk"], "son-kul": ["сон-кул", "сонкул", "соң-көл", "сон-көл", "son-kul", "song-kol", "song kol"],
  "ala-archa": ["ала-арч", "ала арч", "ala-archa", "ala archa"], karakol: ["каракол", "karakol"],
  "jeti-oguz": ["джети", "жети-өгүз", "жети огуз", "jeti"], skazka: ["сказк", "жомок", "skazka", "fairy"],
  "kel-suu": ["кель-суу", "кел-суу", "көл-суу", "kel-suu"], "sary-chelek": ["сары-челек", "sary-chelek", "сарычелек"],
  arslanbob: ["арслан", "arslan"], "tash-rabat": ["таш-рабат", "tash-rabat", "таш рабат"], "ala-kul": ["ала-куль", "ала-көл", "ala-kul"],
  chunkurchak: ["чункурчак", "чуңкурчак", "chunkurchak"], burana: ["бурана", "burana"], "altyn-arashan": ["алтын-арашан", "altyn"],
  barskoon: ["барскоон", "barskoon"], bishkek: ["бишкек", "bishkek"],
};

const QUICK = ["price", "season", "booking", "contact"];

export default function ChatWidget() {
  const { t } = useTranslation();
  const { places } = useApp();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([{ from: "bot", key: "chat.greeting" }]);
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const reply = (text) => {
    const q = text.toLowerCase();
    const tourId = Object.keys(TOUR_WORDS).find((id) => TOUR_WORDS[id].some((w) => q.includes(w)) && places.some((p) => p._id === id));
    if (tourId) return { from: "bot", key: "chat.answers.tour", tourId };
    const topic = TOPICS.find(([, words]) => words.some((w) => q.includes(w)));
    return { from: "bot", key: `chat.answers.${topic ? topic[0] : "default"}` };
  };

  const ask = (text, topicKey) => {
    if (!text.trim()) return;
    setMessages((m) => [...m, { from: "me", text }, topicKey ? { from: "bot", key: `chat.answers.${topicKey}` } : reply(text)]);
    setQuestion("");
  };

  return (
    <div className={`chat-widget ${open ? "open" : ""}`}>
      {open && (
        <div className="chat-panel" role="dialog" aria-label={t("chat.title")}>
          <header>
            <span className="chat-avatar"><Icon name="mountain" size={18} /></span>
            <span>
              <b>{t("chat.title")}</b>
              <small><i className="online-dot" /> {t("chat.online")}</small>
            </span>
            <button onClick={() => setOpen(false)} aria-label={t("common.close")}>
              <Icon name="close" size={18} />
            </button>
          </header>
          <div className="chat-messages" ref={listRef} aria-live="polite">
            {messages.map((m, i) => (
              <div className={`chat-message ${m.from}`} key={i}>
                {m.text ??
                  t(m.key, {
                    phone: CONTACTS.phone,
                    email: CONTACTS.email,
                    tour: m.tourId ? t(`tours.${m.tourId}.name`) : "",
                  })}
                {m.tourId && (
                  <Link to={`/places/${m.tourId}`} onClick={() => setOpen(false)}>
                    {t("chat.openTour")} <Icon name="arrowRight" size={14} />
                  </Link>
                )}
              </div>
            ))}
          </div>
          <div className="chat-quick">
            {QUICK.map((k) => (
              <button key={k} type="button" onClick={() => ask(t(`chat.quick.${k}`), k)}>
                {t(`chat.quick.${k}`)}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(question);
            }}
          >
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t("chat.placeholder")}
              aria-label={t("chat.placeholder")}
              maxLength={300}
            />
            <button aria-label={t("chat.send")} disabled={!question.trim()}>
              <Icon name="send" size={18} />
            </button>
          </form>
        </div>
      )}
      <button className="chat-trigger" onClick={() => setOpen(!open)} aria-label={open ? t("common.close") : t("chat.open")} aria-expanded={open}>
        <Icon name={open ? "close" : "message"} size={22} />
        <span>{t("chat.trigger")}</span>
      </button>
    </div>
  );
}
