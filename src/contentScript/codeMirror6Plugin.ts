// To avoid importing @codemirror packages directly, we import CodeMirror types, then
// later, require dynamically.
//
// This allows us to continue supporting older versions of Joplin that don't depend
// on @codemirror/ packages.
import type * as CodeMirrorAutocompleteType from '@codemirror/autocomplete';
import type { CompletionContext, CompletionResult, Completion } from '@codemirror/autocomplete';
import type * as CodeMirrorLanguageType from '@codemirror/language';
import type { EditorState } from '@codemirror/state';

import { PluginContext } from './types';

const codeMirror6Plugin = (context: PluginContext, CodeMirror: any) => {
	const { autocompletion, insertCompletionText } = require('@codemirror/autocomplete') as typeof CodeMirrorAutocompleteType;
	const { syntaxTree } = require('@codemirror/language') as typeof CodeMirrorLanguageType;

	const isInCodeBlock = (state: EditorState, from: number, to: number) => {
		let inCodeBlock = false;

		syntaxTree(state).iterate({
			from,
			to,
			enter: (node) => {
				if (node.name === 'FencedCode' || node.name === 'CodeBlock') {
					inCodeBlock = true;
				}

				// Skip all nodes if already known to be in a code block
				// (false => skip child nodes).
				return !inCodeBlock;
			}
		});

		return inCodeBlock;
	};

	const completeMarkdown = async (completionContext: CompletionContext): Promise<CompletionResult> => {
		const prefix = completionContext.matchBefore(/[#][^ \n\t#]*/);
		if (!prefix) {
			return null;
		}

		if (isInCodeBlock(completionContext.state, prefix.from, prefix.to)) {
			return null;
		}

		const { tags, keepText } = await context.postMessage({
			command: 'getTags',
		});

		const searchText = prefix.text.substring(1);
		const matchingTags = tags.filter(tag => tag.title.startsWith(searchText));

		const completions: Completion[] = [];
		for (const tag of matchingTags) {
			completions.push({
				label: tag.title,
				apply: async (view, completion, from, to) => {
					context.postMessage({
						command: 'setTag',
						tag,
					});

					if (!!keepText) {
						view.dispatch(insertCompletionText(
							view.state,
							`#${completion.label}`,
							from,
							to,
						));
					} else {
						view.dispatch(insertCompletionText(
							view.state,
							'',
							from,
							to,
						));
					}
				}
			});
		}

		if (searchText.length > 0) {
			const tagExists = tags.findIndex(t => t.title === prefix) > 0;
			if (!tagExists) {
				completions.push({
					label: `Create new tag: ${searchText}`,
					apply: (view, _completion, from, to) => {
						context.postMessage({
							command: 'newTag',
							name: searchText,
						});

						let completionText = `#${searchText}`;
						if (!keepText) {
							completionText = '';
						}

						// insertCompletionText also closes the completion dialog
						view.dispatch(insertCompletionText(
							view.state,
							completionText,
							from,
							to,
						));
					}
				});
			}
		}

		return {
			from: prefix.from,
			options: completions,
			filter: false,
		};
	};

	CodeMirror.addExtension([
		CodeMirror.joplinExtensions.completionSource(completeMarkdown),

		autocompletion({
			tooltipClass: () => 'inline-tags-completions',
		}),
	]);
};

export default codeMirror6Plugin;