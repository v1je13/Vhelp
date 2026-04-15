import React, { useState, useEffect, useRef } from "react";
import { Panel, Input, View } from "@vkontakte/vkui";
import Loader from "../components/Loader";

import YaKtoIcon from "../assets/DiaryIcon/YaKto.png";
import DeletedIcon from "../assets/DiaryIcon/DeletedIcon.png";

// Моковые данные путешествий
const travelsData = [
  {
    id: 1,
    title: "Екатеринбург",
    notesCount: 4,
    image:
      "https://images.unsplash.com/photo-1569396116180-210c18042b7d?w=800&h=400&fit=crop",
  },
  {
    id: 2,
    title: "Кыштым",
    notesCount: 2,
    image:
      "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&h=400&fit=crop",
  },
  {
    id: 3,
    title: "Горы",
    notesCount: 6,
    image:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=400&fit=crop",
  },
  {
    id: 4,
    title: "Озера",
    notesCount: 5,
    image:
      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&h=400&fit=crop",
  },
];

// Начальные данные заметок
const initialNotesData = {
  1: [
    {
      id: 1,
      title: "Зоопарк",
      description:
        "Решили сегодня сходить в зоопарк. Екатеринбургский — один из ведущих в России...",
      image:
        "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=400&fit=crop",
    },
    {
      id: 2,
      title: "Музей наивного искусства",
      description:
        "Сегодня открыл для себя место, о котором раньше только слышал краем уха...",
      image:
        "https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?w=800&h=400&fit=crop",
    },
    {
      id: 3,
      title: "Музей изобразительных искусств",
      description:
        "Собрались в Екатеринбургский музей изобразительных искусств...",
      image:
        "https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?w=800&h=400&fit=crop",
    },
    {
      id: 4,
      title: "Театр оперы и балета",
      description: "Посетили знаковое место для искусства Екатеринбурга...",
      image:
        "https://images.unsplash.com/photo-1514306191717-45224512c2d0?w=800&h=400&fit=crop",
    },
  ],
  2: [
    {
      id: 1,
      title: "Белая башня",
      description: "Уникальное место с интересной историей...",
      image:
        "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&h=400&fit=crop",
    },
    {
      id: 2,
      title: "Кыштымский водопад",
      description: "Красивое место для прогулки...",
      image:
        "https://images.unsplash.com/photo-1432405972618-c60b0225b8b9?w=800&h=400&fit=crop",
    },
  ],
  3: [
    {
      id: 1,
      title: "Поход на вершину",
      description: "Незабываемые впечатления...",
      image:
        "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=400&fit=crop",
    },
  ],
  4: [
    {
      id: 1,
      title: "Рыбалка",
      description: "Отличный улов...",
      image:
        "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&h=400&fit=crop",
    },
  ],
};

const defaultImages = [
  "https://images.unsplash.com/photo-1449824913935-59a10b8d200c?w=800&h=400&fit=crop",
  "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800&h=400&fit=crop",
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&h=400&fit=crop",
  "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&h=400&fit=crop",
  "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=800&h=400&fit=crop",
];

export default function SearchPanel({ nav }) {
  const [loading, setLoading] = useState(false);
  const [travels, setTravels] = useState(travelsData);
  const [notes, setNotes] = useState(initialNotesData);

  // Состояния для модалки путешествия
  const [isTravelModalOpen, setIsTravelModalOpen] = useState(false);
  const [newTravelTitle, setNewTravelTitle] = useState("");
  const [newTravelImage, setNewTravelImage] = useState("");
  const [selectedTravelFile, setSelectedTravelFile] = useState(null);
  const [isCreatingTravel, setIsCreatingTravel] = useState(false);

  // Состояния для модалки заметки
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteDescription, setNewNoteDescription] = useState("");
  const [newNoteImage, setNewNoteImage] = useState("");
  const [selectedNoteFile, setSelectedNoteFile] = useState(null);
  const [isCreatingNote, setIsCreatingNote] = useState(false);

  const [activePanel, setActivePanel] = useState("travels");
  const [selectedTravel, setSelectedTravel] = useState(null);

  const travelFileInputRef = useRef(null);
  const noteFileInputRef = useRef(null);

  // ===== ФУНКЦИИ ДЛЯ ПУТЕШЕСТВИЙ =====
  const handleAddTravel = () => setIsTravelModalOpen(true);

  const handleCloseTravelModal = () => {
    setIsTravelModalOpen(false);
    setNewTravelTitle("");
    setNewTravelImage("");
    setSelectedTravelFile(null);
  };

  const handleTravelFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Пожалуйста, выберите изображение");
        return;
      }
      setSelectedTravelFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setNewTravelImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleTravelUploadClick = () => travelFileInputRef.current?.click();

  const handleTravelRemoveImage = () => {
    setSelectedTravelFile(null);
    setNewTravelImage("");
    if (travelFileInputRef.current) travelFileInputRef.current.value = "";
  };

  const handleCreateTravel = async () => {
    if (!newTravelTitle.trim()) {
      alert("Введите название путешествия");
      return;
    }
    setIsCreatingTravel(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const newTravel = {
      id: Date.now(),
      title: newTravelTitle.trim(),
      notesCount: 0,
      image:
        newTravelImage ||
        defaultImages[Math.floor(Math.random() * defaultImages.length)],
    };
    setTravels([newTravel, ...travels]);
    // Инициализируем пустой массив заметок для нового путешествия
    setNotes({ ...notes, [newTravel.id]: [] });
    setIsCreatingTravel(false);
    handleCloseTravelModal();
  };

  const handleDeleteTravel = (travelId) => {
    setTravels(travels.filter((t) => t.id !== travelId));
    // Удаляем заметки путешествия
    const newNotes = { ...notes };
    delete newNotes[travelId];
    setNotes(newNotes);
  };

  // ===== ФУНКЦИИ ДЛЯ ЗАМЕТОК =====
  const handleAddNote = () => setIsNoteModalOpen(true);

  const handleCloseNoteModal = () => {
    setIsNoteModalOpen(false);
    setNewNoteTitle("");
    setNewNoteDescription("");
    setNewNoteImage("");
    setSelectedNoteFile(null);
  };

  const handleNoteFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Пожалуйста, выберите изображение");
        return;
      }
      setSelectedNoteFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setNewNoteImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleNoteUploadClick = () => noteFileInputRef.current?.click();

  const handleNoteRemoveImage = () => {
    setSelectedNoteFile(null);
    setNewNoteImage("");
    if (noteFileInputRef.current) noteFileInputRef.current.value = "";
  };

  const handleCreateNote = async () => {
    if (!newNoteTitle.trim()) {
      alert("Введите название заметки");
      return;
    }
    if (!selectedTravel) return;

    setIsCreatingNote(true);
    await new Promise((resolve) => setTimeout(resolve, 500));

    const newNote = {
      id: Date.now(),
      title: newNoteTitle.trim(),
      description: newNoteDescription.trim() || "Описание заметки...",
      image:
        newNoteImage ||
        defaultImages[Math.floor(Math.random() * defaultImages.length)],
    };

    // Добавляем заметку
    const travelNotes = notes[selectedTravel.id] || [];
    setNotes({
      ...notes,
      [selectedTravel.id]: [newNote, ...travelNotes],
    });

    // Обновляем счетчик заметок в путешествии
    setTravels(
      travels.map((t) =>
        t.id === selectedTravel.id ? { ...t, notesCount: t.notesCount + 1 } : t,
      ),
    );

    // Обновляем selectedTravel
    setSelectedTravel({
      ...selectedTravel,
      notesCount: selectedTravel.notesCount + 1,
    });

    setIsCreatingNote(false);
    handleCloseNoteModal();
  };

  const handleDeleteNote = (noteId) => {
    if (!selectedTravel) return;

    // Удаляем заметку
    const travelNotes = notes[selectedTravel.id] || [];
    setNotes({
      ...notes,
      [selectedTravel.id]: travelNotes.filter((n) => n.id !== noteId),
    });

    // Обновляем счетчик заметок в путешествии
    setTravels(
      travels.map((t) =>
        t.id === selectedTravel.id
          ? { ...t, notesCount: Math.max(0, t.notesCount - 1) }
          : t,
      ),
    );

    // Обновляем selectedTravel
    setSelectedTravel({
      ...selectedTravel,
      notesCount: Math.max(0, selectedTravel.notesCount - 1),
    });
  };

  // ===== ОБЩИЕ ФУНКЦИИ =====
  const handleContinue = (travelId) => {
    const travel = travels.find((t) => t.id === travelId);
    setSelectedTravel(travel);
    setActivePanel("notes");
  };

  const handleBackToTravels = () => {
    setActivePanel("travels");
    setSelectedTravel(null);
  };

  useEffect(() => {
    document.body.style.overflow =
      isTravelModalOpen || isNoteModalOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isTravelModalOpen, isNoteModalOpen]);

  return (
    <>
      <style>{`
        .diary-page {
          background-color: #F6F2E9;
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Roboto', sans-serif;
          padding-bottom: 20px;
        }

        .diary-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          background-color: #F6F2E9;
        }

        .diary-title {
          font-size: 28px;
          font-weight: 700;
          color: #000;
          margin: 0;
        }

        .add-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background-color: #F4D03F;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          color: #000;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .add-btn:active {
          opacity: 0.8;
          transform: scale(0.95);
        }

        .travels-list, .notes-list {
          padding: 0 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .travel-card, .note-card {
          position: relative;
          border-radius: 16px;
          height: 220px;
          background-size: cover;
          background-position: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .travel-card-overlay, .note-card-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 100%);
          border-radius: 16px;
        }

        .travel-card-content, .note-card-content {
          position: relative;
          z-index: 2;
          height: 100%;
          display: flex;
          flex-direction: column;
          padding: 12px;
          box-sizing: border-box;
        }

        .travel-card-header, .note-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 4px;
        }

        .travel-card-title-wrapper, .note-card-title-wrapper {
          flex: 1;
        }

        .travel-card-title, .note-card-title {
          font-size: 22px;
          font-weight: 700;
          color: #fff;
          margin: 0 0 4px 0;
          text-shadow: 0 2px 4px rgba(0,0,0,0.5);
        }

        .travel-notes-count, .note-description {
          font-size: 14px;
          color: rgba(255,255,255,0.95);
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        }

        .travel-card-actions, .note-card-actions {
          display: flex;
          gap: 8px;
        }

        .action-btn {
          width: 40px;
          height: 40px;
          border: none;
          background: transparent;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .action-btn img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        }

        .action-btn:active {
          transform: scale(0.95);
        }

        .travel-card-footer, .note-card-footer {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          margin-top: auto;
        }

        .continue-btn {
          background-color: #F4D03F;
          border: none;
          border-radius: 12px;
          padding: 8px 20px;
          font-size: 14px;
          font-weight: 600;
          color: #000;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }

        .continue-btn:active {
          transform: scale(0.95);
          opacity: 0.9;
        }

        .back-btn {
          background-color: rgba(255,255,255,0.9);
          border: none;
          border-radius: 12px;
          padding: 8px 16px;
          font-size: 14px;
          font-weight: 600;
          color: #000;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          margin-bottom: 16px;
        }

        .back-btn:active {
          transform: scale(0.95);
          opacity: 0.9;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-container {
          background-color: #F6F2E9;
          width: 100%;
          max-width: 400px;
          border-radius: 20px;
          padding: 24px;
          max-height: calc(100vh - 200px);
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .modal-title {
          font-size: 20px;
          font-weight: 700;
          color: #000;
          margin: 0;
        }

        .modal-close {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background-color: rgba(0,0,0,0.1);
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 20px;
          color: #000;
        }

        .modal-body {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-label {
          font-size: 13px;
          font-weight: 600;
          color: #000;
        }

        .form-input, .form-textarea {
          width: 100%;
          padding: 12px 14px;
          border: 2px solid transparent;
          border-radius: 12px;
          background-color: #fff;
          font-size: 15px;
          color: #000;
          outline: none;
          box-sizing: border-box;
          font-family: inherit;
        }

        .form-textarea {
          min-height: 100px;
          resize: vertical;
        }

        .form-input:focus, .form-textarea:focus {
          border-color: #F4D03F;
        }

        .file-input {
          display: none;
        }

        .upload-btn {
          width: 100%;
          padding: 12px;
          border: 2px dashed #ccc;
          border-radius: 12px;
          background-color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 14px;
          color: #666;
        }

        .upload-btn:hover {
          border-color: #F4D03F;
          background-color: #FFFEF5;
        }

        .upload-btn:active {
          transform: scale(0.98);
        }

        .image-preview-container {
          width: 100%;
          height: 160px;
          border-radius: 12px;
          overflow: hidden;
          background-color: #E1E3E6;
          position: relative;
        }

        .image-preview {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .image-remove-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background-color: rgba(0,0,0,0.6);
          border: none;
          color: #fff;
          font-size: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .image-remove-btn:active {
          transform: scale(0.9);
          background-color: rgba(0,0,0,0.8);
        }

        .create-btn {
          background-color: #F4D03F;
          border: none;
          border-radius: 12px;
          padding: 14px 24px;
          font-size: 15px;
          font-weight: 600;
          color: #000;
          cursor: pointer;
          width: 100%;
        }

        .create-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .create-btn:active:not(:disabled) {
          transform: scale(0.98);
          opacity: 0.9;
        }
      `}</style>

      <Panel nav={nav} filled={false}>
        <View activePanel={activePanel}>
          {/* Панель со списком путешествий */}
          <Panel id="travels">
            <div className="diary-page">
              {loading && <Loader />}

              <div className="diary-header">
                <h1 className="diary-title">Дневник</h1>
                <button className="add-btn" onClick={handleAddTravel}>
                  +
                </button>
              </div>

              <div className="travels-list">
                {travels.map((travel) => (
                  <div
                    key={travel.id}
                    className="travel-card"
                    style={{ backgroundImage: `url(${travel.image})` }}
                  >
                    <div className="travel-card-overlay"></div>
                    <div className="travel-card-content">
                      <div className="travel-card-header">
                        <div className="travel-card-title-wrapper">
                          <h2 className="travel-card-title">{travel.title}</h2>
                          <span className="travel-notes-count">
                            {travel.notesCount}{" "}
                            {getNotesWord(travel.notesCount)}
                          </span>
                        </div>
                        <div className="travel-card-actions">
                          <button
                            className="action-btn"
                            onClick={() => handleContinue(travel.id)}
                          >
                            <img src={YaKtoIcon} alt="Я кто" />
                          </button>
                          <button
                            className="action-btn"
                            onClick={() => handleDeleteTravel(travel.id)}
                          >
                            <img src={DeletedIcon} alt="Удалить" />
                          </button>
                        </div>
                      </div>
                      <div className="travel-card-footer">
                        <button
                          className="continue-btn"
                          onClick={() => handleContinue(travel.id)}
                        >
                          Далее
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          {/* Панель с заметками путешествия */}
          <Panel id="notes">
            <div className="diary-page">
              {loading && <Loader />}

              <div className="diary-header">
                <button className="back-btn" onClick={handleBackToTravels}>
                  ← Назад
                </button>
                <button
                  className="add-btn"
                  onClick={handleAddNote}
                  style={{ width: "36px", height: "36px", fontSize: "24px" }}
                >
                  +
                </button>
              </div>

              {selectedTravel && (
                <>
                  <div style={{ padding: "0 16px 16px" }}>
                    <h2 className="diary-title" style={{ fontSize: "24px" }}>
                      {selectedTravel.title}
                    </h2>
                  </div>

                  <div className="notes-list">
                    {(notes[selectedTravel.id] || []).map((note) => (
                      <div
                        key={note.id}
                        className="note-card"
                        style={{ backgroundImage: `url(${note.image})` }}
                      >
                        <div className="note-card-overlay"></div>
                        <div className="note-card-content">
                          <div className="note-card-header">
                            <div className="note-card-title-wrapper">
                              <h3 className="note-card-title">{note.title}</h3>
                              <p className="note-description">
                                {note.description}
                              </p>
                            </div>
                            <div className="note-card-actions">
                              <button className="action-btn" onClick={() => {}}>
                                <img src={YaKtoIcon} alt="Я кто" />
                              </button>
                              <button
                                className="action-btn"
                                onClick={() => handleDeleteNote(note.id)}
                              >
                                <img src={DeletedIcon} alt="Удалить" />
                              </button>
                            </div>
                          </div>
                          <div className="note-card-footer">
                            <button className="continue-btn" onClick={() => {}}>
                              Далее
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Если заметок нет */}
                    {(notes[selectedTravel.id] || []).length === 0 && (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "40px 16px",
                          color: "#818c99",
                          fontSize: "16px",
                        }}
                      >
                        Пока нет заметок. Нажмите + чтобы добавить первую!
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </Panel>
        </View>

        {/* Модальное окно для создания путешествия */}
        {isTravelModalOpen && (
          <div className="modal-overlay" onClick={handleCloseTravelModal}>
            <div
              className="modal-container"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2 className="modal-title">Новое путешествие</h2>
                <button
                  className="modal-close"
                  onClick={handleCloseTravelModal}
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Название путешествия</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Париж, Горы, Отпуск..."
                    value={newTravelTitle}
                    onChange={(e) => setNewTravelTitle(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Фотография (необязательно)
                  </label>
                  <input
                    type="file"
                    ref={travelFileInputRef}
                    className="file-input"
                    accept="image/*"
                    onChange={handleTravelFileChange}
                  />
                  {!newTravelImage ? (
                    <button
                      className="upload-btn"
                      onClick={handleTravelUploadClick}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect
                          x="3"
                          y="3"
                          width="18"
                          height="18"
                          rx="2"
                          ry="2"
                        />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      <span>Выбрать фото</span>
                    </button>
                  ) : (
                    <div className="image-preview-container">
                      <img
                        src={newTravelImage}
                        alt="Preview"
                        className="image-preview"
                      />
                      <button
                        className="image-remove-btn"
                        onClick={handleTravelRemoveImage}
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
                <button
                  className="create-btn"
                  onClick={handleCreateTravel}
                  disabled={isCreatingTravel || !newTravelTitle.trim()}
                >
                  {isCreatingTravel ? "Создание..." : "Создать путешествие"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Модальное окно для создания заметки */}
        {isNoteModalOpen && (
          <div className="modal-overlay" onClick={handleCloseNoteModal}>
            <div
              className="modal-container"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2 className="modal-title">Новая заметка</h2>
                <button className="modal-close" onClick={handleCloseNoteModal}>
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Название заметки</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Зоопарк, Музей..."
                    value={newNoteTitle}
                    onChange={(e) => setNewNoteTitle(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Описание</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Расскажите о месте..."
                    value={newNoteDescription}
                    onChange={(e) => setNewNoteDescription(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Фотография (необязательно)
                  </label>
                  <input
                    type="file"
                    ref={noteFileInputRef}
                    className="file-input"
                    accept="image/*"
                    onChange={handleNoteFileChange}
                  />
                  {!newNoteImage ? (
                    <button
                      className="upload-btn"
                      onClick={handleNoteUploadClick}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect
                          x="3"
                          y="3"
                          width="18"
                          height="18"
                          rx="2"
                          ry="2"
                        />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      <span>Выбрать фото</span>
                    </button>
                  ) : (
                    <div className="image-preview-container">
                      <img
                        src={newNoteImage}
                        alt="Preview"
                        className="image-preview"
                      />
                      <button
                        className="image-remove-btn"
                        onClick={handleNoteRemoveImage}
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
                <button
                  className="create-btn"
                  onClick={handleCreateNote}
                  disabled={isCreatingNote || !newNoteTitle.trim()}
                >
                  {isCreatingNote ? "Создание..." : "Создать заметку"}
                </button>
              </div>
            </div>
          </div>
        )}
      </Panel>
    </>
  );
}

function getNotesWord(count) {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return "заметок";
  switch (lastDigit) {
    case 1:
      return "заметка";
    case 2:
    case 3:
    case 4:
      return "заметки";
    default:
      return "заметок";
  }
}
