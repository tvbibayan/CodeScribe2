document.addEventListener('DOMContentLoaded', () => {
    if (window.mermaid && typeof window.mermaid.initialize === 'function') {
        mermaid.initialize({ startOnLoad: false, theme: 'neutral' });
    }

    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    const analyzeButton = document.getElementById('analyze-button');
    const defaultButtonLabel = analyzeButton.textContent;
    const uploadZipButton = document.getElementById('upload-zip-button');
    const projectZipInput = document.getElementById('project-zip-input');
    const projectUploadStatus = document.getElementById('project-upload-status');
    const codeInput = document.getElementById('code-input');
    const traceInput = document.getElementById('trace-input');
    const loader = document.getElementById('loader');

    const docOutput = document.getElementById('doc-output');
    const auditOutput = document.getElementById('audit-output');
    const traceOutput = document.getElementById('trace-output');
    const visualizerOutput = document.getElementById('visualizer-output');
    const databaseOutput = document.getElementById('database-output');

    const modalOverlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalCode = document.getElementById('modal-code');
    const modalClose = modalOverlay.querySelector('.modal-close');
    const modalCopyButton = modalOverlay.querySelector('.modal-copy-button');

    let lastSubmittedCode = '';

    const setUploadStatus = (message) => {
        if (projectUploadStatus) {
            projectUploadStatus.textContent = message;
        }
    };

    const setActiveTab = (targetTab) => {
        tabButtons.forEach((button) => {
            const isActive = button.dataset.tab === targetTab;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-selected', String(isActive));
        });

        tabContents.forEach((pane) => {
            const isActive = pane.dataset.tab === targetTab;
            pane.classList.toggle('active', isActive);
            if (isActive) {
                pane.removeAttribute('hidden');
            } else {
                pane.setAttribute('hidden', 'true');
            }
        });
    };

    tabButtons.forEach((button) => {
        button.addEventListener('click', () => setActiveTab(button.dataset.tab));
    });

    setActiveTab('doc');

    const setLoaderState = (isLoading) => {
        loader.style.display = isLoading ? 'block' : 'none';
        analyzeButton.disabled = isLoading;
        analyzeButton.textContent = isLoading ? 'Analyzing...' : defaultButtonLabel;
    };

    const renderMarkdown = (element, markdownText, fallbackMessage) => {
        if (!markdownText) {
            element.textContent = fallbackMessage;
            return;
        }
        element.innerHTML = marked.parse(markdownText);
    };

    const renderVisualizer = async (visualizerPayload) => {
        if (!visualizerPayload) {
            visualizerOutput.textContent = 'No call graph generated.';
            return;
        }

        if (visualizerPayload.mode === 'project') {
            await renderProjectGraph(visualizerPayload);
            return;
        }

        if (typeof visualizerPayload === 'object' && visualizerPayload.error) {
            visualizerOutput.textContent = visualizerPayload.error;
            return;
        }

        let mermaidDefinition = '';
        let graphvizSvg = '';
        let fallbackMessage = '';

        if (typeof visualizerPayload === 'string') {
            const trimmed = visualizerPayload.trim();
            if (trimmed.startsWith('graph')) {
                mermaidDefinition = trimmed;
            } else if (trimmed.startsWith('<svg')) {
                graphvizSvg = trimmed;
            } else {
                fallbackMessage = trimmed;
            }
        } else if (typeof visualizerPayload === 'object') {
            mermaidDefinition = (visualizerPayload.mermaid || '').trim();
            graphvizSvg = (visualizerPayload.graphviz || '').trim();
            fallbackMessage = (visualizerPayload.message || visualizerPayload.error || '').trim();
        }

        if (mermaidDefinition && window.mermaid && typeof window.mermaid.render === 'function') {
            try {
                const uniqueId = `visualizer-graph-${Date.now()}`;
                const { svg } = await mermaid.render(uniqueId, mermaidDefinition);
                visualizerOutput.innerHTML = svg;
                return;
            } catch (error) {
                console.error('Mermaid render error:', error);
            }
        }

        if (graphvizSvg) {
            if (graphvizSvg.startsWith('<svg')) {
                visualizerOutput.innerHTML = graphvizSvg;
            } else {
                visualizerOutput.textContent = graphvizSvg;
            }
            return;
        }

        visualizerOutput.textContent = fallbackMessage || 'No call graph generated.';
    };

    const renderProjectGraph = async (payload) => {
        const { mermaid: mermaidDefinition, metadata = {}, nodes = [], edges = [] } = payload;
        visualizerOutput.innerHTML = '';

        if (mermaidDefinition && window.mermaid && typeof window.mermaid.render === 'function') {
            try {
                const uniqueId = `project-visualizer-${Date.now()}`;
                const { svg } = await mermaid.render(uniqueId, mermaidDefinition);
                visualizerOutput.innerHTML = svg;
            } catch (error) {
                console.error('Project mermaid render error:', error);
                visualizerOutput.textContent = 'Project graph available but rendering failed.';
            }
        } else {
            visualizerOutput.textContent = 'Project graph data ready. Unable to render diagram.';
        }

        const metaWrapper = document.createElement('div');
        metaWrapper.className = 'graph-meta';
        metaWrapper.innerHTML = `
            <h4>Project Graph Snapshot</h4>
            <ul>
                <li><strong>Files:</strong> ${metadata.files ?? '—'}</li>
                <li><strong>Functions:</strong> ${metadata.defined_functions ?? '—'}</li>
                <li><strong>External Calls:</strong> ${metadata.external_nodes ?? '—'}</li>
                <li><strong>Edges:</strong> ${metadata.edges ?? '—'}</li>
                <li><strong>SQL Queries:</strong> ${metadata.sql_queries ?? 0}</li>
            </ul>
        `;
        visualizerOutput.appendChild(metaWrapper);

        if (nodes.length && edges.length) {
            const summary = document.createElement('p');
            summary.className = 'graph-meta__summary';
            summary.textContent = `Nodes: ${nodes.length}, Edges: ${edges.length}. Use browser zoom to inspect.`;
            visualizerOutput.appendChild(summary);
        }
    };

    const clearDynamicButtons = () => {
        docOutput.querySelectorAll('.test-gen-button').forEach((btn) => btn.remove());
        auditOutput.querySelectorAll('.refactor-button').forEach((btn) => btn.remove());
    };

    const extractFunctionName = (text) => {
        if (!text) return null;
        const trimmed = text.trim();
        if (/high-level summary/i.test(trimmed)) return null;
        const match = trimmed.match(/`?([A-Za-z_][A-Za-z0-9_]*)`?(?:\s*\(|$)/);
        if (!match) return null;
        const name = match[1];
        if (!name || ['summary', 'overview', 'documentation'].includes(name.toLowerCase())) {
            return null;
        }
        return name;
    };

    const injectDocumentationActions = () => {
        const headings = docOutput.querySelectorAll('h3, h4, h5');
        const seen = new Set();
        headings.forEach((heading) => {
            const name = extractFunctionName(heading.textContent);
            if (!name || seen.has(name)) return;
            seen.add(name);
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'dynamic-button test-gen-button';
            button.dataset.functionName = name;
            button.textContent = `Generate Test for ${name}`;
            heading.insertAdjacentElement('afterend', button);
        });

        if (seen.size === 0) {
            const codeBlocks = docOutput.querySelectorAll('code');
            codeBlocks.forEach((codeBlock) => {
                const maybeName = extractFunctionName(codeBlock.textContent);
                if (!maybeName || seen.has(maybeName)) return;
                seen.add(maybeName);
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'dynamic-button test-gen-button';
                button.dataset.functionName = maybeName;
                button.textContent = `Generate Test for ${maybeName}`;
                codeBlock.insertAdjacentElement('afterend', button);
            });
        }
    };

    const injectAuditActions = () => {
        const severityKeywords = ['Critical', 'High', 'Medium', 'Low'];
        const candidates = auditOutput.querySelectorAll('li, p, div');
        candidates.forEach((node) => {
            if (node.querySelector('.refactor-button')) return;
            const text = node.textContent || '';
            if (!severityKeywords.some((keyword) => text.includes(keyword))) return;
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'dynamic-button refactor-button';
            button.dataset.vulnerabilityContext = text.trim();
            button.textContent = 'Fix This';
            node.appendChild(button);
        });
    };

    const showModal = (title, code) => {
        modalTitle.textContent = title;
        modalCode.textContent = code || '';
        modalOverlay.removeAttribute('hidden');
    };

    const hideModal = () => {
        modalOverlay.setAttribute('hidden', '');
        modalCode.textContent = '';
    };

    modalClose.addEventListener('click', hideModal);
    modalOverlay.addEventListener('click', (event) => {
        if (event.target === modalOverlay) {
            hideModal();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !modalOverlay.hasAttribute('hidden')) {
            hideModal();
        }
    });

    modalCopyButton.addEventListener('click', async () => {
        const code = modalCode.textContent;
        if (!code) return;
        try {
            await navigator.clipboard.writeText(code);
            modalCopyButton.textContent = 'Copied!';
            setTimeout(() => { modalCopyButton.textContent = 'Copy Code'; }, 1500);
        } catch (error) {
            console.error('Copy failed:', error);
        }
    });

    const handleAnalyze = async () => {
        const code = codeInput.value.trim();
        const traceSnippet = traceInput.value.trim();

        if (!code) {
            docOutput.textContent = 'Please paste some code first.';
            setActiveTab('doc');
            return;
        }

        setLoaderState(true);
        clearDynamicButtons();

        docOutput.textContent = 'Generating documentation...';
        auditOutput.textContent = 'Assessing security posture...';
        traceOutput.textContent = traceSnippet ? 'Tracing execution...' : 'Add an invocation snippet to generate a live trace.';
        visualizerOutput.textContent = 'Building call graph...';
        databaseOutput.textContent = 'Scanning for SQL queries...';

        try {
            const response = await fetch('/analyze-all', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code, trace_input: traceSnippet })
            });

            const payload = await response.json();

            if (!response.ok) {
                const message = payload.error || 'The server returned an error.';
                docOutput.textContent = `Error: ${message}`;
                auditOutput.textContent = '';
                traceOutput.textContent = '';
                visualizerOutput.textContent = '';
                databaseOutput.textContent = '';
                setActiveTab('doc');
                return;
            }

            lastSubmittedCode = code;

            renderMarkdown(docOutput, payload.documentation, 'No documentation generated.');
            renderMarkdown(auditOutput, payload.audit, 'No security findings reported.');
            renderMarkdown(traceOutput, payload.trace, 'No live trace explanation available.');
            await renderVisualizer(payload.visualizer);
            renderMarkdown(databaseOutput, payload.database_report, 'No database report available.');

            injectDocumentationActions();
            injectAuditActions();
        } catch (error) {
            console.error('Fetch Error:', error);
            docOutput.textContent = 'An error occurred. Check the console (F12) for details.';
            auditOutput.textContent = '';
            traceOutput.textContent = '';
            visualizerOutput.textContent = '';
            databaseOutput.textContent = '';
            setActiveTab('doc');
        } finally {
            setLoaderState(false);
        }
    };

    analyzeButton.addEventListener('click', handleAnalyze);

    const handleZipUpload = async () => {
        if (!projectZipInput || !uploadZipButton) {
            return;
        }
        const file = projectZipInput.files?.[0];
        if (!file) {
            setUploadStatus('Select a .zip file that contains your project.');
            return;
        }

        const formData = new FormData();
        formData.append('projectZip', file);
        setUploadStatus('Uploading and analyzing project...');
        uploadZipButton.disabled = true;
        uploadZipButton.textContent = 'Mapping project...';

        try {
            const response = await fetch('/upload-zip', {
                method: 'POST',
                body: formData,
            });
            const payload = await response.json();
            if (!response.ok) {
                const message = payload.error || 'Project analysis failed.';
                throw new Error(message);
            }

            renderMarkdown(docOutput, payload.project_summary, 'No project summary available.');
            renderMarkdown(auditOutput, payload.project_security, 'No project security report available.');
            await renderVisualizer(payload.visualizer);
            renderMarkdown(databaseOutput, payload.database_report, 'No database report available.');
            traceOutput.textContent = 'Project uploads do not run live trace sessions.';
            lastSubmittedCode = '';
            if (typeof payload.file_count === 'number') {
                setUploadStatus(`Analyzed ${payload.file_count} Python files.`);
            } else {
                setUploadStatus('Project analysis complete.');
            }
            setActiveTab('visualizer');
        } catch (error) {
            console.error('Upload Zip Error:', error);
            setUploadStatus(error.message || 'Project analysis failed.');
        } finally {
            uploadZipButton.disabled = false;
            uploadZipButton.textContent = 'Upload Project .zip';
        }
    };

    if (uploadZipButton) {
        uploadZipButton.addEventListener('click', handleZipUpload);
    }

    const handleGenerateTest = async (functionName) => {
        if (!lastSubmittedCode) {
            showModal('Missing Source', 'Please analyze code before requesting tests.');
            return;
        }

        try {
            const response = await fetch('/generate-test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code: lastSubmittedCode, function_name: functionName })
            });
            const payload = await response.json();

            if (!response.ok) {
                const message = payload.error || 'Unable to generate tests.';
                showModal('Generate Test Failed', message);
                return;
            }

            showModal(`Generated tests for ${functionName}`, payload.test_code || 'No test output returned.');
        } catch (error) {
            console.error('Generate Test Error:', error);
            showModal('Generate Test Failed', 'An unexpected error occurred while generating tests.');
        }
    };

    const handleRefactor = async (vulnerabilityContext) => {
        if (!lastSubmittedCode) {
            showModal('Missing Source', 'Please analyze code before requesting fixes.');
            return;
        }

        try {
            const response = await fetch('/refactor-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code: lastSubmittedCode, vulnerability_context: vulnerabilityContext })
            });
            const payload = await response.json();

            if (!response.ok) {
                const message = payload.error || 'Unable to refactor code.';
                showModal('Refactor Failed', message);
                return;
            }

            showModal('Suggested Fix', payload.refactored_code || 'No refactor output returned.');
        } catch (error) {
            console.error('Refactor Error:', error);
            showModal('Refactor Failed', 'An unexpected error occurred while refactoring.');
        }
    };

    document.addEventListener('click', (event) => {
        const testButton = event.target.closest('.test-gen-button');
        if (testButton) {
            const functionName = testButton.dataset.functionName;
            if (functionName) {
                handleGenerateTest(functionName);
            }
            return;
        }

        const refactorButton = event.target.closest('.refactor-button');
        if (refactorButton) {
            const context = refactorButton.dataset.vulnerabilityContext || '';
            if (context) {
                handleRefactor(context);
            }
        }
    });
});

