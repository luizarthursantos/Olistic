interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Overrides the destructive button's label. Defaults to "Delete". */
  confirmLabel?: string;
  /**
   * Optional safer alternative, shown as the highlighted button so the
   * destructive path is not the easiest one to hit.
   */
  secondaryAction?: { label: string; onClick: () => void };
}

export function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Delete',
  secondaryAction,
}: ConfirmDialogProps) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
        <p style={{ fontSize: 14, marginBottom: 20, lineHeight: 1.5, whiteSpace: 'pre-line' }}>{message}</p>
        <div className="modal-actions" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={onCancel}>
            Cancel
          </button>
          {/* Safe action sits beside Cancel; the destructive one wraps below
              it on narrow screens rather than leading the row. */}
          {secondaryAction && (
            <button className="btn btn-primary btn-sm" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </button>
          )}
          <button className="btn btn-danger btn-sm" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
