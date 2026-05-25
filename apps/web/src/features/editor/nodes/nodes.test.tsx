import { type ReactElement } from 'react';

import { ReactFlowProvider, type NodeProps } from '@xyflow/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  ConditionNode,
  EmailNode,
  EndNode,
  LetterNode,
  SmsNode,
  StartNode,
  WaitNode,
  WhatsAppNode,
  nodeTypes,
} from './index';

/** Minimal NodeProps for unit rendering — the nodes only read data + selected. */
function nodeProps(data: Record<string, unknown>, selected = false): NodeProps {
  return { data, selected } as unknown as NodeProps;
}

function renderNode(element: ReactElement) {
  return render(<ReactFlowProvider>{element}</ReactFlowProvider>);
}

describe('custom nodes', () => {
  it('exposes a nodeTypes entry for each of the 8 node types', () => {
    expect(Object.keys(nodeTypes).sort()).toEqual(
      ['condition', 'email', 'end', 'letter', 'sms', 'start', 'wait', 'whatsapp'].sort(),
    );
  });

  it('renders the start node with its default label', () => {
    renderNode(<StartNode {...nodeProps({})} />);
    expect(screen.getByText('Début')).toBeInTheDocument();
  });

  it('renders the end node with its default label', () => {
    renderNode(<EndNode {...nodeProps({})} />);
    expect(screen.getByText('Fin')).toBeInTheDocument();
  });

  it('uses a custom label from data when present', () => {
    renderNode(<EmailNode {...nodeProps({ label: 'Relance J+7', notifySecretariat: true })} />);
    expect(screen.getByText('Relance J+7')).toBeInTheDocument();
  });

  it('shows the discreet Bell when notifySecretariat is on and no override', () => {
    renderNode(<SmsNode {...nodeProps({ notifySecretariat: true })} />);
    expect(screen.getByTestId('notif-default')).toBeInTheDocument();
    expect(screen.queryByTestId('notif-override')).not.toBeInTheDocument();
  });

  it('shows the orange AlertTriangle when an email override is set', () => {
    renderNode(
      <WhatsAppNode
        {...nodeProps({ notifySecretariat: true, notificationEmailOverride: 'urgences@labo.fr' })}
      />,
    );
    expect(screen.getByTestId('notif-override')).toBeInTheDocument();
    expect(screen.queryByTestId('notif-default')).not.toBeInTheDocument();
  });

  it('shows no notification badge when notifySecretariat is off', () => {
    renderNode(<LetterNode {...nodeProps({ notifySecretariat: false })} />);
    expect(screen.queryByTestId('notif-default')).not.toBeInTheDocument();
    expect(screen.queryByTestId('notif-override')).not.toBeInTheDocument();
  });

  it('falls back to channel default labels when none is provided', () => {
    renderNode(<EmailNode {...nodeProps({ notifySecretariat: true })} />);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('summarises the wait delay in the label', () => {
    renderNode(<WaitNode {...nodeProps({ delay: { value: 7, unit: 'days' } })} />);
    expect(screen.getByText('Attendre 7 days')).toBeInTheDocument();
  });

  it('falls back to the bare "Attente" label when no delay is set', () => {
    renderNode(<WaitNode {...nodeProps({})} />);
    expect(screen.getByText('Attente')).toBeInTheDocument();
  });

  it('defaults a channel node to notify ON when the flag is absent', () => {
    renderNode(<EmailNode {...nodeProps({})} />);
    expect(screen.getByTestId('notif-default')).toBeInTheDocument();
  });

  it('uses the condition string as label when no explicit label is set', () => {
    renderNode(<ConditionNode {...nodeProps({ condition: 'SMS livré ?' })} />);
    expect(screen.getByText('SMS livré ?')).toBeInTheDocument();
  });

  it('falls back to "Condition" when neither label nor condition is set', () => {
    renderNode(<ConditionNode {...nodeProps({})} />);
    expect(screen.getByText('Condition')).toBeInTheDocument();
  });

  it('renders the condition node with Oui / Non branch labels', () => {
    renderNode(<ConditionNode {...nodeProps({ label: 'Email ouvert ?' })} />);
    expect(screen.getByText('Email ouvert ?')).toBeInTheDocument();
    expect(screen.getByText('Oui')).toBeInTheDocument();
    expect(screen.getByText('Non')).toBeInTheDocument();
  });

  it('applies a selection ring when the node is selected', () => {
    const { container } = renderNode(
      <EmailNode {...nodeProps({ notifySecretariat: true }, true)} />,
    );
    expect(container.querySelector('.ring-2')).not.toBeNull();
  });

  it('renders a status dot when data.status is set', () => {
    renderNode(<EmailNode {...nodeProps({ notifySecretariat: true, status: 'current' })} />);
    expect(screen.getByTestId('status-dot')).toBeInTheDocument();
  });

  it('omits the status dot when no status is set', () => {
    renderNode(<EmailNode {...nodeProps({ notifySecretariat: true })} />);
    expect(screen.queryByTestId('status-dot')).not.toBeInTheDocument();
  });

  it('renders the red error validation badge from data.validation', () => {
    renderNode(
      <EmailNode
        {...nodeProps({
          notifySecretariat: true,
          validation: { type: 'error', message: 'Nœud orphelin' },
        })}
      />,
    );
    const badge = screen.getByTestId('validation-error');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('text-red-600');
  });

  it('renders the amber warning validation badge from data.validation', () => {
    renderNode(
      <WaitNode
        {...nodeProps({ validation: { type: 'warning', message: 'Sans étape suivante' } })}
      />,
    );
    const badge = screen.getByTestId('validation-warning');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('text-amber-600');
  });
});
