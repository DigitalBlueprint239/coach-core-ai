import React from 'react';
import {render,screen,fireEvent} from '@testing-library/react';
import WeekDashboard,{dateKey} from './WeekDashboard';
import AppShell from './AppShell';

const today=new Date(2026,9,14,12);
test('a new workspace has no invented events or actionable assignments',()=>{
  const navigate=jest.fn();render(<WeekDashboard today={today} preview={false} onPreviewChange={jest.fn()} onNavigate={navigate}/>);
  expect(screen.queryByText('Team practice')).not.toBeInTheDocument();
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  expect(screen.getByText('A clear field ahead')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Manage Teams'}));expect(navigate).toHaveBeenCalledWith('teams');
});
test('sample tasks are interactive and clearly labeled; dates follow the review day',()=>{
  const change=jest.fn();render(<WeekDashboard today={today} preview onPreviewChange={change} onNavigate={jest.fn()}/>);
  expect(screen.getByText('Design preview · fictional sample data')).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Wednesday, October 14, 2026'})).toHaveAttribute('aria-pressed','true');
  fireEvent.click(screen.getByRole('checkbox',{name:'Check practice equipment'}));
  expect(screen.getByRole('checkbox',{name:'Check practice equipment'})).toBeChecked();
  fireEvent.click(screen.getByRole('button',{name:'View sample event'}));
  expect(screen.getByRole('dialog',{name:'Team practice'})).toHaveTextContent('fictional event cannot be opened');
  fireEvent.click(screen.getByRole('button',{name:'Exit sample preview'}));expect(change).toHaveBeenCalledWith(false);
});
test('calendar controls move weeks and return to Today',()=>{
  render(<WeekDashboard today={today} preview={false} onPreviewChange={jest.fn()} onNavigate={jest.fn()}/>);
  fireEvent.click(screen.getByRole('button',{name:'Next week'}));
  expect(screen.getByRole('button',{name:'Monday, October 19, 2026'})).toHaveAttribute('aria-pressed','true');
  fireEvent.click(screen.getByRole('button',{name:'Today'}));
  expect(screen.getByRole('button',{name:'Wednesday, October 14, 2026'})).toHaveAttribute('aria-pressed','true');
  expect(dateKey(today)).toBe('2026-10-14');
});
test('shell navigation exposes current destination and focuses the content after a change',()=>{
  const navigate=jest.fn();const {rerender}=render(<AppShell active="overview" onNavigate={navigate} email="coach@example.test"><p>Dashboard</p></AppShell>);
  fireEvent.click(screen.getAllByRole('button',{name:'Teams'})[0]);expect(navigate).toHaveBeenCalledWith('teams');
  rerender(<AppShell active="teams" onNavigate={navigate} email="coach@example.test"><p>Teams screen</p></AppShell>);
  expect(screen.getByRole('main')).toHaveFocus();
  expect(screen.getAllByRole('button',{name:'Teams'})[0]).toHaveAttribute('aria-current','page');
  expect(screen.queryByRole('button',{name:/Film/})).not.toBeInTheDocument();
});
