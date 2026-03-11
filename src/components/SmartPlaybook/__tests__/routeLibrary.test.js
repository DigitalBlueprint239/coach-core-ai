/**
 * routeLibrary.test.js – Tests for RouteLibrary ghost preview functionality
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import RouteLibrary, { ROUTES } from '../components/RouteLibrary';

describe('RouteLibrary', () => {
  it('renders without crashing', () => {
    render(<RouteLibrary onRouteTypeChange={() => {}} />);
    expect(screen.getByText('Route Type')).toBeInTheDocument();
  });

  it('renders a button for each route type', () => {
    render(<RouteLibrary onRouteTypeChange={() => {}} />);
    ROUTES.forEach(route => {
      const btn = screen.getByRole('button', { name: `${route.name} route` });
      expect(btn).toBeInTheDocument();
    });
  });

  it('calls onRouteTypeChange when a route button is clicked', () => {
    const onChange = jest.fn();
    render(<RouteLibrary onRouteTypeChange={onChange} selectedRouteType="custom" />);
    fireEvent.click(screen.getByRole('button', { name: 'Hitch route' }));
    expect(onChange).toHaveBeenCalledWith('hitch');
  });

  it('marks the selected route button as pressed', () => {
    render(<RouteLibrary onRouteTypeChange={() => {}} selectedRouteType="slant" />);
    const slantBtn = screen.getByRole('button', { name: 'Slant route' });
    expect(slantBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows ghost preview tooltip on hover', () => {
    render(<RouteLibrary onRouteTypeChange={() => {}} />);
    const goBtn = screen.getByRole('button', { name: 'Go route' });
    fireEvent.mouseEnter(goBtn);
    // Preview tooltip appears
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByRole('tooltip')).toHaveAttribute('aria-label', 'Preview: Go');
  });

  it('removes ghost preview on mouse leave', () => {
    render(<RouteLibrary onRouteTypeChange={() => {}} />);
    const goBtn = screen.getByRole('button', { name: 'Go route' });
    fireEvent.mouseEnter(goBtn);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.mouseLeave(goBtn);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('ghost preview does not affect state (no route assigned)', () => {
    const onChange = jest.fn();
    render(<RouteLibrary onRouteTypeChange={onChange} selectedRouteType="custom" />);
    const hitchBtn = screen.getByRole('button', { name: 'Hitch route' });
    // Hover should NOT trigger onRouteTypeChange
    fireEvent.mouseEnter(hitchBtn);
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.mouseLeave(hitchBtn);
    expect(onChange).not.toHaveBeenCalled();
  });
});
