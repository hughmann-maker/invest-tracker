import React from 'react';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { expect, test, describe, vi, beforeEach, afterEach } from 'vitest';
import { DeleteTickerModal } from './DeleteTickerModal';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, className, onClick }: any) => (
            <div className={className} onClick={onClick}>{children}</div>
        ),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
    Trash2: () => <svg data-testid="trash-icon" />,
    X: () => <svg data-testid="x-icon" />,
}));

// Helper to render with providers
const renderWithProviders = (ui: React.ReactElement) => {
    return render(
        <LanguageProvider>{ui}</LanguageProvider>
    );
};

describe('DeleteTickerModal', () => {
    const mockOnClose = vi.fn();
    const mockOnConfirm = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    test('renders nothing when ticker is null', () => {
        const { container } = renderWithProviders(
            <DeleteTickerModal ticker={null} onClose={mockOnClose} onConfirm={mockOnConfirm} />
        );
        expect(container.querySelector('h2')).toBeNull();
    });

    test('renders modal with ticker name when ticker is provided', () => {
        renderWithProviders(
            <DeleteTickerModal ticker="VWCE.DE" onClose={mockOnClose} onConfirm={mockOnConfirm} />
        );
        expect(screen.getByRole('heading', { name: 'Smazat aktivum' })).toBeInTheDocument();
        expect(screen.getByText('VWCE.DE')).toBeInTheDocument();
    });

    test('calls onConfirm with ticker and default reason when no reason given', () => {
        const { container } = renderWithProviders(
            <DeleteTickerModal ticker="SXR8.DE" onClose={mockOnClose} onConfirm={mockOnConfirm} />
        );
        const modal = within(container);
        const confirmBtn = modal.getAllByRole('button').find(b => b.textContent === 'Smazat aktivum')!;
        fireEvent.click(confirmBtn);
        expect(mockOnConfirm).toHaveBeenCalledWith('SXR8.DE', 'Nezadán důvod');
    });

    test('calls onConfirm with ticker and provided reason', () => {
        const { container } = renderWithProviders(
            <DeleteTickerModal ticker="IS3N.DE" onClose={mockOnClose} onConfirm={mockOnConfirm} />
        );
        const modal = within(container);
        const reasonInput = modal.getByPlaceholderText(/Přesunuto do ETF/i);
        fireEvent.change(reasonInput, { target: { value: 'Prodáno se ziskem' } });
        const confirmBtn = modal.getAllByRole('button').find(b => b.textContent === 'Smazat aktivum')!;
        fireEvent.click(confirmBtn);
        expect(mockOnConfirm).toHaveBeenCalledWith('IS3N.DE', 'Prodáno se ziskem');
    });

    test('calls onClose when Zrušit clicked', () => {
        const { container } = renderWithProviders(
            <DeleteTickerModal ticker="SYBJ.DE" onClose={mockOnClose} onConfirm={mockOnConfirm} />
        );
        const modal = within(container);
        fireEvent.click(modal.getByText('Zrušit'));
        expect(mockOnClose).toHaveBeenCalled();
    });
});
