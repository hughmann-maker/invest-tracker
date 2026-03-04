import React from 'react';
import { render, screen } from '@testing-library/react';
import { expect, test, describe, vi } from 'vitest';
import { RebalanceAlert } from './RebalanceAlert';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';

// Mock framer-motion to avoid animation issues in jsdom
vi.mock('framer-motion', () => {
    return {
        motion: {
            div: ({ children, className }: any) => <div className={className}>{children}</div>,
        },
    };
});

// Mock lucide-react icons
vi.mock('lucide-react', () => {
    return {
        RefreshCcw: () => <svg data-testid="refresh-icon" />,
        AlertCircle: () => <svg data-testid="alert-icon" />
    };
});

const renderWithProviders = (ui: React.ReactElement) =>
    render(<LanguageProvider>{ui}</LanguageProvider>);

describe('RebalanceAlert', () => {
    test('renders nothing when not visible', () => {
        const { container } = renderWithProviders(<RebalanceAlert isVisible={false} actions={[]} exchangeRate={25} />);
        expect(container).toBeEmptyDOMElement();
    });

    test('renders nothing when visible but no actions', () => {
        const { container } = renderWithProviders(<RebalanceAlert isVisible={true} actions={[]} exchangeRate={25} />);
        expect(container).toBeEmptyDOMElement();
    });

    test('renders alert with correct actions', () => {
        const actions = [
            { ticker: 'VWCE.DE', action: 'KOUPIT', amountEur: 100 }
        ] as any;
        renderWithProviders(<RebalanceAlert isVisible={true} actions={actions} exchangeRate={25} />);

        expect(screen.getByText(/Nutná rebalance/i)).toBeInTheDocument();
        expect(screen.getByText('KOUPIT')).toBeInTheDocument();
        expect(screen.getByText('VWCE.DE')).toBeInTheDocument();
    });
});
