import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

export default function TestMath() {
    const testMarkdown = `
# Math Rendering Test

Inline math: $E = mc^2$

Inline math in parentheses: ($\\frac{\\partial T}{\\partial t} = \\alpha \\frac{\\partial^2 T}{\\partial x^2}$)

Block math:

$$ \\frac{d}{dx}f(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h} $$

Another example: $x^2 + y^2 = z^2$

User reported failing case (Single Backslash - Should Work):
Aim- To solve heat equation ($\frac{\partial T}{\partial t} = \alpha \frac{\partial^2 T}{\partial x^2}$) using Finite Difference Method.

Double Backslash Case (Simulating API issue - Should Fail or Show Raw):
Aim- To solve heat equation ($\\frac{\\partial T}{\\partial t} = \\alpha \\frac{\\partial^2 T}{\\partial x^2}$) using Finite Difference Method.
  `;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow">
                <h1 className="text-2xl font-bold mb-4">KaTeX Rendering Test</h1>
                <div className="prose prose-neutral max-w-none">
                    <ReactMarkdown
                        remarkPlugins={[remarkMath, remarkGfm]}
                        rehypePlugins={[rehypeKatex]}
                    >
                        {testMarkdown}
                    </ReactMarkdown>
                </div>
            </div>
        </div>
    );
}
