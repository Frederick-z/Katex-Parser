// ==UserScript==
// @name         KaTeX HTML解析复制LaTeX公式
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  解析并复制 KaTeX 渲染公式为 LaTeX 
// @author       Frederick-z
// @match        https://yuanbao.tencent.com/chat/*
// @grant        GM_setClipboard
// @run-at       document-end
// ==/UserScript==
(function () {
    'use strict';

    const mathFunctions = {
        'log': '\\log', 'sin': '\\sin', 'cos': '\\cos', 'tan': '\\tan',
        'lim': '\\lim', 'max': '\\max', 'min': '\\min', 'exp': '\\exp',
        'sum': '\\sum', 'prod': '\\prod', 'det': '\\det', 'rank': '\\rank'
    };

    const specialSymbols = {
        'α': '\\alpha', 'β': '\\beta', 'γ': '\\gamma', 'δ': '\\delta',
        'ε': '\\epsilon', 'ζ': '\\zeta', 'η': '\\eta', 'θ': '\\theta',
        'λ': '\\lambda', 'μ': '\\mu', 'π': '\\pi', 'σ': '\\sigma',
        'φ': '\\phi', 'ψ': '\\psi', 'ω': '\\omega', '∗': '*'
    };

    function parseChildren(parent) {
        if (!parent) return '';
        let result = '';
        for (const child of parent.childNodes) {
            result += parseKatexElement(child);
        }
        return result;
    }

    function parseKatexElement(el) {
        if (el.nodeType === Node.TEXT_NODE) {
            const text = el.textContent.trim();
            return specialSymbols[text] || text;
        }

        if (el.nodeType !== Node.ELEMENT_NODE) {
            return '';
        }

        const classes = Array.from(el.classList || []);

        if (classes.includes('sqrt')) {
            const contentEl = el.querySelector('.vlist-r > .mord');
            return `\\sqrt{${parseChildren(contentEl)}}`;
        }

        if (classes.includes('mfrac')) {
            const vlistR = el.querySelector('.vlist-r > .vlist');
            if (vlistR) {
                const topElements = Array.from(
                    vlistR.querySelectorAll(':scope > span[style*="top:"]')
                ).filter(span => !span.querySelector('.frac-line'));

                if (topElements.length >= 2) {
                    // 注意：KaTeX 的结构里，前面是 numerator，后面是 denominator
                    const numeratorEl = topElements[0];
                    const denominatorEl = topElements[1];
                    console.log("test-->length",topElements.length )
                    console.log("test-->total",topElements )

                    console.log('test frac numeratorEl:', numeratorEl);
                    console.log('test frac denominatorEl:', denominatorEl);
                    const numerator = parseChildren(numeratorEl);   // 递归解析，保留 P_c / \hat{R}_c
                    const denominator = parseChildren(denominatorEl);

                    return `\\frac{${denominator}}{${numerator}}`;
                }
            }
            return '\\frac{}{}'; // Fallback
        }

        if (classes.includes('msupsub')) {
            const vlistT = el.querySelector('.vlist-t');
            if (!vlistT) return parseChildren(el); // Fallback

            // 规则：同时有上下标
            if (vlistT.classList.contains('vlist-t2')) {
                const vlistR = vlistT.querySelector('.vlist-r');
                if (vlistR) {
                    const topElements = Array.from(vlistR.querySelectorAll('span[style*="top"]'));
                    if (topElements.length >= 2) {
                        // 从下到上，所以最后一个是上标，第一个是下标
                        const supEl = topElements[topElements.length - 1];
                        const subEl = topElements[0];
                        const sup = parseChildren(supEl);
                        const sub = parseChildren(subEl);
                        return `^{${sup}}_{${sub}}`;
                    }
                }
                // 规则：只有下标
                const subContent = vlistT.querySelector('.vlist > span[style*="top"]');
                if (subContent) {
                    return `_{${parseChildren(subContent)}}`;
                }

            } else {
                // 规则：只有上标
                const supContent = vlistT.querySelector('.vlist > span[style*="top"]');
                if (supContent) {
                    return `^{${parseChildren(supContent)}}`;
                }
            }
        }

        // 单独的 msup 和 msub 作为后备，以防有未覆盖的简单场景
        if (classes.includes('msup')) {
            const content = el.querySelector('.vlist-t .sizing');
            return `^{${parseChildren(content)}}`;
        }

        if (classes.includes('msub')) {
            const content = el.querySelector('.vlist-t .sizing');
            return `_{${parseChildren(content)}}`;
        }

        if (classes.includes('mop')) {
    // 先处理带 limits 的大运算符：\sum, \prod, \int 等
    if (classes.includes('op-limits')) {
        const symbolEl = el.querySelector('.op-symbol');
        const symbol = symbolEl?.textContent?.trim() || '';

        // 找到包含三个（或两个）兄弟 span 的 vlist
        const vlist = el.querySelector('.vlist-t.vlist-t2 .vlist-r .vlist');
        let sub = '', sup = '';

        if (vlist && symbolEl) {
            const spans = Array.from(vlist.children).filter(n => n.tagName === 'SPAN');
            const idx = spans.findIndex(s => s.querySelector('.op-symbol'));

            // KaTeX 结构： [subSpan] [opSymbolSpan] [supSpan]
            const subSpan = idx > 0 ? spans[idx - 1] : null;
            const supSpan = (idx >= 0 && idx + 1 < spans.length) ? spans[idx + 1] : null;

            const extract = (span) => {
                if (!span) return '';
                const sizing = span.querySelector('.sizing.reset-size6.size3') || span;
                const val = parseChildren(sizing).trim();
                return val;
            };

            sub = extract(subSpan);
            sup = extract(supSpan);
        }

        const opMap = { '∑': '\\sum', '∏': '\\prod', '∫': '\\int' };
        const opLatex = opMap[symbol] || mathFunctions[symbol] || symbol || '';

        let out = opLatex;
        if (sub) out += `_{${sub}}`;   // 只有非空才输出
        if (sup) out += `^{${sup}}`;   // 只有非空才输出
        return out;
    }

    // 其它普通 math operator（如 \log、\sin …），按原规则返回
    const text = el.textContent.trim();
    return mathFunctions[text] || text;
}
        if (classes.includes('accent')) {
            const content = el.querySelector('.mord');
            return `\\hat{${parseChildren(content)}}`;
        }

        if (classes.includes('mathcal')) return `\\mathcal{${parseChildren(el)}}`;
        if (classes.includes('mathbb')) return `\\mathbb{${parseChildren(el)}}`;
        if (classes.includes('mathrm')) return `\\mathrm{${parseChildren(el)}}`;
        if (classes.includes('text')) return `\\text{${parseChildren(el)}}`;

        if (el.childNodes.length > 0) {
            return parseChildren(el);
        }

        return el.textContent.trim();
    }

    function convertKatexToLatex(katexEl) {
        const htmlContainer = katexEl.querySelector('.katex-html');
        if (!htmlContainer) return '';
        let latex = parseChildren(htmlContainer);
        return latex.replace(/\s+/g, ' ').replace(/\s*([=\+\-\*,])\s*/g, ' $1 ').trim();
    }

    function handleFormulaClick(event) {
        event.stopPropagation();
        const formula = this;
        try {
            const latex = convertKatexToLatex(formula);
            if (!latex) return;
            GM_setClipboard(latex);
            const originalBg = formula.style.backgroundColor;
            formula.style.backgroundColor = '#e6ffe6';
            setTimeout(() => { formula.style.backgroundColor = originalBg; }, 1000);
            console.log('复制的LaTeX公式:', latex);
            //alert(`LaTeX公式已复制:\n${latex}`);
        } catch (error) {
            console.error('公式转换错误:', error, formula);
            //alert('公式转换失败，请检查控制台输出');
        }
    }

    function markFormulaClickable(formula) {
        if (formula.classList.contains('latex-clickable')) return;
        formula.classList.add('latex-clickable');
        formula.style.cursor = 'pointer';
        formula.title = '点击复制LaTeX代码';
        formula.addEventListener('click', handleFormulaClick);
    }

    function markExistingFormulas() {
        document.querySelectorAll('.katex-display, .katex').forEach(markFormulaClickable);
    }

    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (node.classList?.contains('katex-display') || node.classList?.contains('katex')) {
                        markFormulaClickable(node);
                    }
                    node.querySelectorAll('.katex-display, .katex').forEach(markFormulaClickable);
                }
            });
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    markExistingFormulas();
})();
