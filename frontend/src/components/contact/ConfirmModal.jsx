import { useEffect } from 'react';
import '../../styles/contact/confirm-modal.css';

export default function ConfirmModal({
    title = '¿Estas segura?',
    message = 'Esta acción no se puede deshacer',
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    onConfirm,
    onCancel,
    loading = false,
}) {
    useEffect(() => {
        function handleKeyDown(event) {
            if (event.key === 'Escape' && !loading) {
                onCancel()
            }
        }

        document.addEventListener('keydown', handleKeyDown)

        return () => {
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [onCancel, loading])

    return (
        <div 
        className="confirm-modal-backdrop" 
        onClick={() => {
            if (!loading) {
                onCancel()
            }
        }}>
            <div 
            className="confirm-modal"
            onClick={event => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal.title"
            >
                <div className='confirm-modal-icon'>
                    ⚠
                </div>

                <div className='confirm-modal-content'>
                    <h2 id='confirm-modal-title'>{title}</h2>
                    <p>{message}</p>
                </div>
                
            </div>
        </div>
    )
}



