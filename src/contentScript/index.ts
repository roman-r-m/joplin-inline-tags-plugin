import codeMirror5Plugin from './codeMirror5Plugin';
import codeMirror6Plugin from './codeMirror6Plugin';

module.exports = {
	default: function(context: any) {
		return {
			plugin: (CodeMirror: any) => {
				if (CodeMirror.cm6) {
					return codeMirror6Plugin(context, CodeMirror);
				} else {
					return codeMirror5Plugin(context, CodeMirror);
				}
			},
			codeMirrorResources: [
				'addon/hint/show-hint',
			],
			codeMirrorOptions: {
				'inlineTags': true,
			},
			assets: () => {
				return [
					{ name: './show-hint.css'},
				];
			}
		}
	}
};
