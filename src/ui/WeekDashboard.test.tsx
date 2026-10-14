import React from 'react';
import {render,screen,fireEvent,within} from '@testing-library/react';
import WeekDashboard,{dateKey} from './WeekDashboard';
import AppShell from './AppShell';

const today=new Date(2026,9,14,12);
test('a new workspace has no invented events or actionable assignments',()=>{
  const navigate=jest.fn();render(<WeekDashboard today={today} preview={false} onPreviewChange={jest.fn()} onNavigate={navigate}/>);
  expect(screen.queryByText('Team practice')).not.toBeInTheDocument();
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  expect(screen.getByText('A clear field ahead')).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole('button',{name:'Manage Teams'})[0]);expect(navigate).toHaveBeenCalledWith('teams');
});
test('sample tasks are interactive and clearly labeled; dates follow the review day',()=>{
  const change=jest.fn();render(<WeekDashboard today={today} preview onPreviewChange={change} onNavigate={jest.fn()}/>);
  expect(screen.getByText('Sample data · preview')).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Wednesday, October 14, 2026'})).toHaveAttribute('aria-pressed','true');
  fireEvent.click(screen.getByRole('checkbox',{name:'Check practice equipment'}));
  expect(screen.getByRole('checkbox',{name:'Check practice equipment'})).toBeChecked();
  fireEvent.click(screen.getAllByRole('button',{name:'View practice preview'})[0]);
  expect(screen.getByRole('dialog',{name:'Team practice'})).toHaveTextContent('fictional event cannot be opened');
  fireEvent.click(screen.getByRole('button',{name:'Exit preview'}));expect(change).toHaveBeenCalledWith(false);
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

test('selecting a saved practice updates its real detail without inventing periods or a start time',()=>{
  render(<WeekDashboard today={today} preview={false} onPreviewChange={jest.fn()} onNavigate={jest.fn()} events={[
    {id:'a',title:'Alpha practice',date:'2026-10-14',kind:'plan',durationMinutes:60,periods:[{name:'Receiver release',durationMinutes:15}],goals:['Clean footwork'],notes:'Bring cones.'},
    {id:'b',title:'Beta practice',date:'2026-10-15',kind:'plan'},
  ]}/>);
  const detail=within(screen.getByRole('region',{name:'Selected practice'}));
  expect(detail.getByText('Receiver release')).toBeInTheDocument();
  expect(detail.getByText('Bring cones.')).toBeInTheDocument();
  expect(detail.queryByText('Sample concept')).not.toBeInTheDocument();
  expect(screen.queryByText('7 AM')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Beta practice, Oct 15, time not set'}));
  expect(detail.getByRole('heading',{name:'Beta practice'})).toBeInTheDocument();
  expect(detail.getByText('Time not set')).toBeInTheDocument();
  expect(detail.getByText('No period information in this plan.')).toBeInTheDocument();
  expect(detail.queryByText('Receiver release')).not.toBeInTheDocument();
});
