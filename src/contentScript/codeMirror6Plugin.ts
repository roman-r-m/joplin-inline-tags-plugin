// To avoid importing @codemirror packages directly, we import CodeMirror types, then
// later, require dynamically.
//
// This allows us to continue supporting older versions of Joplin that don't depend
// on @codemirror/ packages.
import type * as CodeMirrorAutocompleteType from '@codemirror/autocomplete';
import type * as CodeMirrorLangMarkdownType from '@codemirror/lang-markdown';
import type { CompletionContext, CompletionResult, Completion } from '@codemirror/autocomplete';

import { PluginContext } from './types';

const codeMirror6Plugin = (context: PluginContext, CodeMirror: any) => {
	const { autocompletion, insertCompletionText } = require('@codemirror/autocomplete') as typeof CodeMirrorAutocompleteType;
	const { markdownLanguage } = require('@codemirror/lang-markdown') as typeof CodeMirrorLangMarkdownType;
	

	const completeMarkdown = async (completionContext: CompletionContext): Promise<CompletionResult> => {
		const prefix = completionContext.matchBefore(/[#][^ \n\t#]*/);
		if (!prefix) {
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
		// Avoid completing in code blocks:
		markdownLanguage.data.of({
			autocomplete: completeMarkdown,
		}),
		CodeMirror.joplinExtensions.enableLanguageDataAutocomplete.of(true),

		autocompletion({
			tooltipClass: () => 'inline-tags-completions',
		}),
	]);
};

export default codeMirror6Plugin;