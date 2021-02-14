module.exports = {
	default: function(context: any) {

		const buildHints = async (prefix: string) =>{
			const {tags, keepText } = await context.postMessage({
				command: 'getTags',
			});
			let hints = [];
			for (let i = 0; i < tags.length; i++) {
				const tag = tags[i];
				if (prefix === '#' || tag.title.startsWith(prefix)) {
					hints.push({
						text: '#' + tag.title,
						displayText: tag.title,
						hint: async (cm, data, completion) => {
							context.postMessage({
								command: 'setTag',
								tag: tag,
							});
							if (!!keepText) {
								cm.replaceRange(tag.title, completion.from || data.from, cm.getCursor(), "complete");
							} else {
								const from = completion.from || data.from;
								from.ch -= 1;
								cm.replaceRange('', from, cm.getCursor(), "complete");
							}
						}
					});
				}
			}
			if (prefix !== '#') {
				const tagExists = tags.findIndex(t => t.title === prefix) > 0;
				if (!tagExists) {
					hints.push({
						text: `Create new tag: ${prefix}`,
						hint: (cm, data, completion) => {
							context.postMessage({
								command: 'newTag',
								name: prefix,
							});
							if (!keepText) {
								const from = completion.from || data.from;
								from.ch -= 1;
								cm.replaceRange('', from, cm.getCursor(), "complete");
							}
						}
					});
				}
			}
			return hints;
		}

		const plugin = function(CodeMirror) {
			CodeMirror.defineOption('inlineTags', false, function(cm, value, prev) {
				if (!value) return;

				cm.on('inputRead', async function (cm1, change) {
					if (!cm1.state.completionActive && change.text[0] === '#') {
						const start = {line: change.from.line, ch: change.from.ch + 1};
						const hint = function(cm, callback) {
							const cursor = cm.getCursor();
							const token = cm.getRange(start, cursor);

							buildHints(token).then(hints => {
								callback({
									list: hints,
									from: {line: change.from.line, ch: change.from.ch + 1},
									to: {line: change.to.line, ch: change.to.ch + 1},
								});
							});
						};

						setTimeout(function () {
							CodeMirror.showHint(cm, hint, {
								completeSingle: false,
								closeOnUnfocus: true,
								async: true,
							});
						}, 10);
					}
				});
			});
		};

		return {
			plugin: plugin,
			codeMirrorResources: [
			    'addon/hint/show-hint',
			    ],
			codeMirrorOptions: {
    			'inlineTags': true,
			},
			assets: function() {
			    return [
			        { name: './show-hint.css'},
			    ]
			}
        }
    }
}