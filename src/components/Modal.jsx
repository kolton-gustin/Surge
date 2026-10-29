function Modal({ title, children, onClose, onSubmit }) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="modal" onSubmit={onSubmit}>
        <h2>{title}</h2>
        {children}
        <div className="modal-actions">
          <button type="button" className="button outline" onClick={onClose}>Cancel</button>
          <button className="button" type="submit">Save</button>
        </div>
      </form>
    </div>
  );
}

export default Modal;
