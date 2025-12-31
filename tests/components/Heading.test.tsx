import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Heading } from '../../src/components/Heading';

afterEach(() => {
  cleanup();
});

describe('Heading', () => {
  it('renders h1 element when as="h1"', () => {
    render(<Heading as="h1">Heading 1</Heading>);

    expect(screen.getByRole('heading', { level: 1, name: 'Heading 1' })).toBeInTheDocument();
  });

  it('renders h2 element when as="h2"', () => {
    render(<Heading as="h2">Heading 2</Heading>);

    expect(screen.getByRole('heading', { level: 2, name: 'Heading 2' })).toBeInTheDocument();
  });

  it('renders h3 element when as="h3"', () => {
    render(<Heading as="h3">Heading 3</Heading>);

    expect(screen.getByRole('heading', { level: 3, name: 'Heading 3' })).toBeInTheDocument();
  });

  it('renders h4 element when as="h4"', () => {
    render(<Heading as="h4">Heading 4</Heading>);

    expect(screen.getByRole('heading', { level: 4, name: 'Heading 4' })).toBeInTheDocument();
  });

  it('renders h5 element when as="h5"', () => {
    render(<Heading as="h5">Heading 5</Heading>);

    expect(screen.getByRole('heading', { level: 5, name: 'Heading 5' })).toBeInTheDocument();
  });

  it('renders h6 element when as="h6"', () => {
    render(<Heading as="h6">Heading 6</Heading>);

    expect(screen.getByRole('heading', { level: 6, name: 'Heading 6' })).toBeInTheDocument();
  });

  it('applies default size class (medium)', () => {
    render(<Heading as="h1">Test</Heading>);

    const heading = screen.getByRole('heading');
    expect(heading).toHaveClass('header_size_medium');
  });

  it('applies small size class', () => {
    render(<Heading as="h1" size="small">Test</Heading>);

    const heading = screen.getByRole('heading');
    expect(heading).toHaveClass('header_size_small');
  });

  it('applies large size class', () => {
    render(<Heading as="h1" size="large">Test</Heading>);

    const heading = screen.getByRole('heading');
    expect(heading).toHaveClass('header_size_large');
  });

  it('applies default variant class (standard)', () => {
    render(<Heading as="h1">Test</Heading>);

    const heading = screen.getByRole('heading');
    expect(heading).toHaveClass('header_variant_standard');
  });

  it('applies underlined variant class', () => {
    render(<Heading as="h1" variant="underlined">Test</Heading>);

    const heading = screen.getByRole('heading');
    expect(heading).toHaveClass('header_variant_underlined');
  });

  it('applies caps variant class', () => {
    render(<Heading as="h1" variant="caps">Test</Heading>);

    const heading = screen.getByRole('heading');
    expect(heading).toHaveClass('header_variant_caps');
  });

  it('applies caps-underline variant class', () => {
    render(<Heading as="h1" variant="caps-underline">Test</Heading>);

    const heading = screen.getByRole('heading');
    expect(heading).toHaveClass('header_variant_caps-underline');
  });

  it('applies default text-align class (left)', () => {
    render(<Heading as="h1">Test</Heading>);

    const heading = screen.getByRole('heading');
    expect(heading).toHaveClass('header_text-align_left');
  });

  it('applies right text-align class', () => {
    render(<Heading as="h1" textAlign="right">Test</Heading>);

    const heading = screen.getByRole('heading');
    expect(heading).toHaveClass('header_text-align_right');
  });

  it('applies center text-align class', () => {
    render(<Heading as="h1" textAlign="center">Test</Heading>);

    const heading = screen.getByRole('heading');
    expect(heading).toHaveClass('header_text-align_center');
  });

  it('applies indent text-align class', () => {
    render(<Heading as="h1" textAlign="indent">Test</Heading>);

    const heading = screen.getByRole('heading');
    expect(heading).toHaveClass('header_text-align_indent');
  });

  it('merges custom className with generated classes', () => {
    render(<Heading as="h1" className="custom-class">Test</Heading>);

    const heading = screen.getByRole('heading');
    expect(heading).toHaveClass('header');
    expect(heading).toHaveClass('custom-class');
  });

  it('passes additional props to the element', () => {
    render(<Heading as="h1" id="test-id" data-testid="test-heading">Test</Heading>);

    const heading = screen.getByTestId('test-heading');
    expect(heading).toHaveAttribute('id', 'test-id');
  });

  it('renders children content', () => {
    render(
      <Heading as="h1">
        <span>Complex</span> <strong>Content</strong>
      </Heading>
    );

    expect(screen.getByText('Complex')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('combines all classes correctly', () => {
    render(
      <Heading
        as="h2"
        size="large"
        variant="underlined"
        textAlign="center"
        className="extra"
      >
        Full Props
      </Heading>
    );

    const heading = screen.getByRole('heading');
    expect(heading).toHaveClass('header');
    expect(heading).toHaveClass('header_size_large');
    expect(heading).toHaveClass('header_variant_underlined');
    expect(heading).toHaveClass('header_text-align_center');
    expect(heading).toHaveClass('extra');
  });
});
