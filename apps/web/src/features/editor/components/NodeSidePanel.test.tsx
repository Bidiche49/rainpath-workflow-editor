import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AppNode } from '../hooks/useWorkflowEditor';
import {
  NodeSidePanel,
  formatCondition,
  parseCondition,
  type NodeSidePanelProps,
} from './NodeSidePanel';

function emailNode(data: Record<string, unknown> = {}): AppNode {
  return { id: 'n1', type: 'email', position: { x: 0, y: 0 }, data: { label: 'Email', ...data } };
}

function renderPanel(node: AppNode, overrides: Partial<NodeSidePanelProps> = {}) {
  const onUpdateNodeData = vi.fn();
  render(
    <NodeSidePanel
      open
      node={node}
      notificationEmail="secretariat@labo.fr"
      onOpenChange={vi.fn()}
      onUpdateNodeData={onUpdateNodeData}
      {...overrides}
    />,
  );
  return { onUpdateNodeData };
}

describe('condition codec', () => {
  it('defaults the kind to data-available for an unencoded string', () => {
    expect(parseCondition('email ouvert')).toEqual({
      kind: 'data-available',
      detail: 'email ouvert',
    });
  });

  it('round-trips a previous-result condition', () => {
    const encoded = formatCondition('previous-result', 'SMS livré');
    expect(parseCondition(encoded)).toEqual({ kind: 'previous-result', detail: 'SMS livré' });
  });

  it('falls back to data-available for an unknown kind prefix', () => {
    expect(parseCondition('bogus::x')).toEqual({ kind: 'data-available', detail: 'x' });
  });
});

describe('NodeSidePanel', () => {
  it('edits the message of a channel node', () => {
    const { onUpdateNodeData } = renderPanel(emailNode({ notifySecretariat: true }));
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Bonjour' } });
    expect(onUpdateNodeData).toHaveBeenCalledWith('n1', { content: 'Bonjour' });
  });

  it('shows the workflow email as read-only when notifications are on', () => {
    renderPanel(emailNode({ notifySecretariat: true }));
    const input = screen.getByLabelText('Email du secrétariat (workflow)') as HTMLInputElement;
    expect(input.value).toBe('secretariat@labo.fr');
    expect(input).toHaveAttribute('readonly');
  });

  it('clears the override when the secretariat switch is turned off', () => {
    const { onUpdateNodeData } = renderPanel(
      emailNode({ notifySecretariat: true, notificationEmailOverride: 'x@y.fr' }),
    );
    fireEvent.click(screen.getByRole('switch', { name: 'Notifier le secrétariat' }));
    expect(onUpdateNodeData).toHaveBeenCalledWith('n1', {
      notifySecretariat: false,
      notificationEmailOverride: undefined,
    });
  });

  it('hides the default-email block when notifications are off', () => {
    renderPanel(emailNode({ notifySecretariat: false }));
    expect(screen.queryByLabelText('Email du secrétariat (workflow)')).not.toBeInTheDocument();
  });

  it('reveals the override warning + field when the disclosure is expanded', () => {
    renderPanel(emailNode({ notifySecretariat: true }));
    expect(screen.queryByLabelText('Adresse e-mail personnalisée')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Personnaliser pour cette étape'));
    expect(screen.getByText(/Déconseillé pour le suivi global/)).toBeInTheDocument();
    expect(screen.getByLabelText('Adresse e-mail personnalisée')).toBeInTheDocument();
  });

  it('propagates a valid override email and rejects an invalid one', () => {
    const { onUpdateNodeData } = renderPanel(emailNode({ notifySecretariat: true }));
    fireEvent.click(screen.getByText('Personnaliser pour cette étape'));
    const field = screen.getByLabelText('Adresse e-mail personnalisée');

    fireEvent.change(field, { target: { value: 'not-an-email' } });
    expect(screen.getByText('Adresse e-mail invalide.')).toBeInTheDocument();
    expect(onUpdateNodeData).not.toHaveBeenCalledWith('n1', {
      notificationEmailOverride: 'not-an-email',
    });

    fireEvent.change(field, { target: { value: 'urgences@labo.fr' } });
    expect(onUpdateNodeData).toHaveBeenCalledWith('n1', {
      notificationEmailOverride: 'urgences@labo.fr',
    });
  });

  it('clears the override when the field is emptied', () => {
    const { onUpdateNodeData } = renderPanel(
      emailNode({ notifySecretariat: true, notificationEmailOverride: 'a@b.fr' }),
    );
    fireEvent.click(screen.getByText('Personnaliser pour cette étape'));
    fireEvent.change(screen.getByLabelText('Adresse e-mail personnalisée'), {
      target: { value: '' },
    });
    expect(onUpdateNodeData).toHaveBeenCalledWith('n1', { notificationEmailOverride: undefined });
  });

  it('edits a wait node delay value', () => {
    const waitNode: AppNode = {
      id: 'w1',
      type: 'wait',
      position: { x: 0, y: 0 },
      data: { label: 'Attente', delay: { value: 1, unit: 'days' } },
    };
    const { onUpdateNodeData } = renderPanel(waitNode);
    fireEvent.change(screen.getByLabelText('Délai d’attente'), { target: { value: '5' } });
    expect(onUpdateNodeData).toHaveBeenCalledWith('w1', { delay: { value: 5, unit: 'days' } });
  });

  it('does not render a notification section for non-channel nodes', () => {
    const waitNode: AppNode = {
      id: 'w1',
      type: 'wait',
      position: { x: 0, y: 0 },
      data: { label: 'Attente', delay: { value: 1, unit: 'days' } },
    };
    renderPanel(waitNode);
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('edits the sub-condition of a condition node (encoded into the string)', () => {
    const conditionNode: AppNode = {
      id: 'c1',
      type: 'condition',
      position: { x: 0, y: 0 },
      data: { label: 'Condition', condition: 'data-available::' },
    };
    const { onUpdateNodeData } = renderPanel(conditionNode);
    fireEvent.change(screen.getByLabelText('Sous-condition'), {
      target: { value: 'RDV confirmé' },
    });
    expect(onUpdateNodeData).toHaveBeenCalledWith('c1', {
      condition: 'data-available::RDV confirmé',
    });
  });
});
