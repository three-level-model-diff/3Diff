const diffType={tbd:"TBD",mechanical:{id:"EDIT",ins:"INS",del:"DEL"},structural:{id:"STRUCTURAL",punctuation:"PUNCTUATION",textInsert:"TEXTINSERT",textDelete:"TEXTDELETE",wordchange:"WORDCHANGE",wordreplace:"WORDREPLACE",textReplace:"TEXTREPLACE",insert:"INSERT",delete:"DELETE",move:"MOVE",noop:"NOOP",wrap:"WRAP",unwrap:"UNWRAP",split:"SPLIT",join:"JOIN",replace:"REPLACE"},semantic:{id:"SEMANTIC",meaning:"MEANING",editchain:"EDITCHAIN"},newTextId:"new",oldTextId:"old"},regexp={punctuation:"^[\\!\\\"\\#\\$\\%\\&'\\(\\)\\*\\+\\,\\-\\.\\/\\:\\;\\=\\?\\@\\[\\]\\^\\_\\`\\{\\|\\}\\~ ]+[A-z]?$",accented:"àèìòùÀÈÌÒÙáéíóúýÁÉÍÓÚÝâêîôûÂÊÎÔÛãñõÃÑÕäëïöüÿÄËÏÖÜŸçÇßØøÅåÆæœ",wordchange:"^\\S*$",tagSelector:"<[.A-z]?[^(><.)]+>",unclosedTagSelector:"<[.A-z]?[^(><.)]+",unopenedTagSelector:"[.A-z]?[^(><.)]+>",textSelector:"[A-z\\s]*",lowercaseLetter:"[a-z]+",tagElements:"[<>/?]",splitJoin:"^[\\s]*<[.A-z]?[^(><.)]+>[\\s]*<[.A-z]?[^(><.)]+>[\\s]*$",openingElement:'<[A-z]+[A-z\\/\\-\\d\\=\\"\\s\\:\\%\\.\\,\\(\\)\\{\\}\\!\\;]*>'},globalUser="USER-0001";class DiffAlgorithmSelector{constructor(t,e,n){let s;switch(n){case DiffAlgorithmSelector.algorithms.diffMatchPatch:s=new DiffMatchPatchAdapter(t,e);break;default:s=null}return s}}DiffAlgorithmSelector.algorithms={diffMatchPatch:"diff_match_patch"};class Adapter{constructor(t,e){this.oldText=t,this.newText=e}makeDiff(t,e){this.threeDiff=new ThreeDiff(t,this.oldText,this.newText,e)}getMechanicalOperations(){return this.threeDiff.getMechanicalOperations()}getStructuralOperations(){return this.threeDiff.getStructuralOperations()}getSemanticOperations(){return this.threeDiff.getSemanticOperations()}getDiffHTML(){return this.threeDiff.getDiffHTML()}}class DiffMatchPatchAdapter extends Adapter{constructor(t,e){super(t,e);let n=new diff_match_patch;this.diffs=n.diff_main(t,e),n.diff_cleanupSemantic(this.diffs),this.patches=n.patch_make(this.diffs),this.html=n.diff_prettyHtml(this.diffs),this.runDiffAlgorithm()}runDiffAlgorithm(){this.makeDiff(this._getMechanicalOps(),this.html)}_getMechanicalOps(){let t=[];for(let e of this.patches){let n=e.start1,s=e.diffs;s.map((e,i)=>{if(i>0){let t=s[i-1];-1!==t[0]&&(n+=parseInt(t[1].length))}if(0!==e[0]){let s=1===e[0]?diffType.mechanical.ins:diffType.mechanical.del;t.push(new MechanicalDiff(s,e[1],n,t.length))}})}return t}}class Diff{constructor(t,e){this.id=this._setId(t,e)}_setId(t,e){let n=`${t}-`,s=4-(++e).toString().length;for(;s>0;)n+="0",s--;return n+e}}class MechanicalDiff extends Diff{constructor(t,e,n,s){super(diffType.mechanical.id,s),this.op=t,this.content=e,this.pos=n}getWord(t,e){let n=t.substring(this.pos,this.pos+e);if(0===n.trim().length)return null;let s=RegExp(`[A-z]*${RegExp.escape(n)}[A-z]*`,"g").execGlobal(t);for(const t of s){const e=t.index+t[0].length;let n=this.pos+this.content.length;if(this.op===diffType.mechanical.del&&(n-=this.content.length),t.index<=this.pos&&e>=n)return/^[A-z\d]*$/.test(t[0])?t:null}return null}getEnclosingTag(t){let e=t.substring(this.pos,this.pos+this.content.length);/^[<>]+/.test(e)&&(e=t.substring(this.pos-this.content.length,this.pos).split(/[<>]/).splice(-1).pop()),/[<>]+$/.test(e)&&(e=t.substring(this.pos-this.content.length,this.pos).split(/[<>]/).splice(-1).pop());let n=RegExp(`<[A-z\\/\\-\\d\\=\\"\\s\\:\\%\\.\\,\\(\\)\\#]*${RegExp.escape(e)}[A-z\\/\\-\\d\\=\\"\\s\\:\\%\\.\\,\\(\\)\\#]*>`,"g").execGlobal(t);for(const e of n){const n=e.index+e[0].length;let s=this.pos+this.content.length;if(this.op===diffType.mechanical.del&&(s-=this.content.length),e.index<this.pos&&n>s){let n=this.getCssSelector(t,e);return null===n?null:(n.path=`#newTextTemplate${n.path}`,{tag:document.querySelector(n.path),index:n.index})}}return null}getTag(t){if(RegExp("^[\\s]*<[\\w]+[\\W\\s\\w\\d]*>[\\s]*$").test(this.content)){let e=RegExp(RegExp.escape(this.content),"g").execGlobal(t);for(const n of e){const e=n.index+n[0].length;let s=this.pos+this.content.length;if(this.op===diffType.mechanical.del&&(s-=this.content.length),n.index<=this.pos&&e>=s){let e=this.getCssSelector(t,n);return null===e?null:(e.path=`#newTextTemplate${e.path}`,{tag:document.querySelector(e.path),index:e.index})}}}return null}getCssSelector(t,e){const n=function(t,e){for(let n=t;n<i.length&&(!i[n].opening&&n!==i.length-1||e.tag!==i[n].tag||i[n].pos++,i[n].deepness===e.deepness);n++);},s=t.substring(0,this.pos);let i=RegExp(`<\\/?[\\w]+[\\w\\/\\-\\d\\=\\"\\s\\:\\%\\#\\?\\;\\&\\.\\,\\(\\)\\{\\}\\!\\;\\+${regexp.accented}]*>`,"g").execGlobal(s);i.push(e),i.map(t=>(t=>(t.tag=t[0].replace(/[<>]/g," ").trim().split(/\s/)[0],t.opening=0!==t.tag.indexOf("/"),t.tag=t.tag.replace("/",""),t.pos=1,t))(t));let l=0;i[i.length-1].deepness=l;for(let t=i.length-2;t>0;t--){let e=i[t],s=i[t+1];e.deepness=l,e.opening||(e.deepness=++l),"img"===e.tag||"wbr"===e.tag||"link"===e.tag||"input"===e.tag?(i.splice(t,1),n(t,e)):e.opening&&!s.opening&&s.tag===e.tag&&(i.splice(t,2),n(t,e),l--)}let r="";for(const t of i)r+=`>${t.tag}`,t.pos>1&&(r+=`:nth-of-type(${t.pos})`);return{index:i.splice(-1).pop().index,path:r}}_getText(t,e){return this.op===diffType.mechanical.ins?e:t}_getContexts(t){return{left:t.substring(0,this.pos),right:t.substring(this.op===diffType.mechanical.ins?this.pos+this.content.length:this.pos,t.length)}}}class StructuralDiff extends Diff{constructor(t,e,n=globalUser){super(diffType.structural.id,t),this.op=diffType.tbd,this.by=n,this.timestamp=new Date,this.items=[e]}setOperation(t){this.op=t}addItem(t){this.items.push(t)}isTextual(){return this.op===diffType.structural.punctuation||this.op===diffType.structural.wordchange||this.op===diffType.structural.wordreplace||this.op===diffType.structural.textInsert||this.op===diffType.structural.textDelete||this.op===diffType.structural.textReplace}}class SemanticDiff extends Diff{constructor(t,e){super(diffType.semantic.id,t),this.op=diffType.tbd,this.items=[e]}setOperation(t){this.op=t}addItem(t){this.items.push(t)}}class ThreeDiff{constructor(t,e,n,s){this.listMechanicalOperations=t,this.listStructuralOperations=[],this.listSemanticOperations=[],this.oldText=e,this.newText=n,this.html=s,this._addTemplates(),this.structuralRules=[(t,e=null)=>null===e&&(!!/^[\s]+$/.test(t.content)&&diffType.structural.noop),(t,e=null)=>{if(null===e)return!1;let n=t.getEnclosingTag(this.newText),s=e.getEnclosingTag(this.newText);return null!==n&&null!==s&&(n.index===s.index&&(t.pos!==e.pos&&(t.content===e.content&&diffType.structural.noop)))},(t,e=null)=>null!==e&&(!(!/^[\s]+$/.test(t.content)||!/^[\s]+$/.test(e.content))&&(e.content===t.content&&(e.pos!==t.pos&&(t.op===e.op&&diffType.structural.move)))),(t,e=null)=>{if(null===e)return!1;if(0===t.content.trim().length&&0===e.content.trim().length)return!1;if(!/\//.test(e.content))return!1;let n=t.getTag(this.newText),s=e.getTag(this.newText);return null!==n&&null===s&&(!(e.pos<n.index||e.pos>n.index+n.tag.outerHTML.length)&&(n.tag.tagName===e.content.replace(/[\\\/<>]/g,"").toUpperCase()&&(t.op===diffType.mechanical.ins?diffType.structural.wrap:diffType.structural.unwrap)))},(t,e=null)=>null===e&&(!!RegExp(regexp.splitJoin).test(t.content)&&(t.op===diffType.mechanical.ins?diffType.structural.split:diffType.structural.join)),(t,e=null)=>{if(null===e)return!1;if(0===t.content.trim().length&&0===e.content.trim().length)return!1;let n=t.getEnclosingTag(this.newText),s=e.getEnclosingTag(this.newText);return null!==n&&null!==s&&(null!==n.tag&&null!==s.tag&&(n.tag===s.tag&&diffType.structural.replace))},(t,e=null)=>{if(null!==e)return!1;if(0===t.content.trim().length)return!1;return null!==t.getEnclosingTag(this.newText)&&diffType.structural.replace},(t,e=null)=>null===e&&(null!==t.getTag(this.newText)&&(t.op===diffType.mechanical.ins?diffType.structural.insert:diffType.structural.delete)),(t,e=null)=>null!==e&&(t.pos===e.pos&&(t.op!==e.op&&(!(!RegExp(regexp.punctuation).test(t.content)||!RegExp(regexp.punctuation).test(e.content))&&diffType.structural.punctuation))),(t,e=null)=>!1,(t,e=null)=>{if(null===e)return!1;if(!/^[A-z\d]*$/.test(t.content)||!/^[A-z\d]*$/.test(e.content))return!1;let n=Math.min(t.content.length,e.content.length),s=t.getWord(this.newText,n),i=e.getWord(this.newText,n);return null!==s&&null!==s[0]&&(null!==i&&null!==i[0]&&(0!==s[0].trim().length&&0!==i[0].trim().length&&(!(!RegExp(regexp.wordchange).test(s)||!RegExp(regexp.wordchange).test(s))&&(s[0]===i[0]&&diffType.structural.wordchange))))},(t,e=null)=>{if(null!==e)return!1;if(!/^[A-z\d]*$/.test(t.content))return!1;let n=t.getWord(this.oldText,this.newText);return null!==n&&null!==n[0]&&(0!==n[0].trim().length&&(!!RegExp(regexp.wordchange).test(n)&&diffType.structural.wordchange))},(t,e=null)=>null!==e&&(0!==t.content.trim().length&&0!==e.content.trim().length&&(t.content!==e.content&&(t.op!==e.op&&(t.pos===e.pos&&diffType.structural.textReplace)))),(t,e=null)=>null===e&&(t.op===diffType.mechanical.ins?diffType.structural.textInsert:diffType.structural.textDelete)],this._executeStructuralAnalysis(),this.semanticRules=[(t,e=null)=>null!==e&&(0!==t.old.trim().length&&0!==e.old.trim().length&&(0!==t.new.trim().length&&0!==e.new.trim().length&&(t.old===e.old&&(t.new===e.new&&diffType.semantic.editchain)))),(t,e=null)=>null===e&&diffType.semantic.meaning],this._executeSemanticAnalysis()}_addTemplates(){let t=document.createElement("div");t.id="oldTextTemplate",t.innerHTML=this.oldText;let e=document.createElement("div");e.id="newTextTemplate",e.innerHTML=this.newText,document.body.appendChild(t),document.body.appendChild(e)}_executeStructuralAnalysis(){let t=this.listMechanicalOperations.slice(0);for(;t.length>0;){let e=!1,n=t.splice(0,1)[0],s=new StructuralDiff(this.listStructuralOperations.length,n);for(let i=0;i<t.length;i++){let l=t[i];for(let r of this.structuralRules){let o=r(n,l);if(this._checkRuleResulCorrectness(o)){s.setOperation(o),s.addItem(t.splice(i,1)[0]),e=!0,i--;break}}if(s.op===diffType.structural.wordchange&&!s.items.includes(l))break;if(s.op===diffType.structural.replace&&!s.items.includes(l))break;if(s.op!==diffType.tbd&&s.op!==diffType.structural.wordchange&&s.op!==diffType.structural.replace)break}if(!e)for(let t of this.structuralRules){let e=t(n);if(this._checkRuleResulCorrectness(e)){s.setOperation(e);break}}this.listStructuralOperations.push(s)}this._setOldsNews()}_executeSemanticAnalysis(){let t=this.listStructuralOperations.slice(0);for(;t.length>0;){let e=!1,n=t.splice(0,1)[0],s=new SemanticDiff(this.listSemanticOperations.length,n);for(let i=0;i<t.length;i++){let l=t[i];for(let r of this.semanticRules){let o=r(n,l);if(this._checkRuleResulCorrectness(o)){s.setOperation(o),s.addItem(t.splice(i,1)[0]),e=!0,i--;break}}}if(!e)for(let t of this.semanticRules){let e=t(n);if(this._checkRuleResulCorrectness(e)){s.setOperation(e);break}}this.listSemanticOperations.push(s)}}_setOldsNews(){for(let t of this.listStructuralOperations)if(t.isTextual()){const e=this._getOldNewText(t);t.new=e.newText,t.old=e.oldText}else t.new="",t.old=""}_getOldNewText(t){let e=t.items,n=this._getContextBoundariesNew(this.newText,e[0],e[e.length-1]),s=n.leftContext;e.map((t,n)=>{let i=e[n+1];t.op===diffType.mechanical.ins?(s+=t.content,void 0!==i&&(s+=this.newText.substring(t.pos+t.content.length,i.pos))):void 0!==i&&(s+=this.newText.substring(t.pos,i.pos))}),s+=n.rightContext;let i=this._getContextBoundariesOld(this.newText,e[0],e[e.length-1]).leftContext;return e.map((t,n)=>{let s=e[n+1];t.op===diffType.mechanical.ins?void 0!==s&&(i+=this.oldText.substring(t.pos,s.pos-t.content.length)):(i+=t.content,void 0!==s&&(i+=this.oldText.substring(t.pos+t.content.length,s.pos+t.content.length)))}),i+=n.rightContext,{newText:sanitize(s),oldText:sanitize(i)}}_getContextBoundariesNew(t,e,n){const s=e.pos,i=n.pos+(n.op===diffType.mechanical.ins?n.content.length:0),l=s<30?0:30,r=i+30<t.length?i+30:t.length;let o=t.substring(l,s).split(/\s/),c=t.substring(i,r).split(/\s/);return{leftContext:sanitize(o[o.length-1]),rightContext:sanitize(c[0])}}_getContextBoundariesOld(t,e,n){const s=e.pos,i=n.pos+(n.op===diffType.mechanical.del?n.content.length:0),l=s<10?0:10,r=i+10<t.length?i+10:t.length;let o=t.substring(l,s).split(/\s/),c=t.substring(i,r).split(/\s/);return{leftContext:o[o.length-1],rightContext:c[0]}}_checkRuleResulCorrectness(t){return!1!==t&&(null!==t&&void 0!==t)}getMechanicalOperations(){return this.listMechanicalOperations}getStructuralOperations(){return this.listStructuralOperations}getSemanticOperations(){return this.listSemanticOperations}getDiffHTML(){return this.html}}RegExp.escape=function(t){return t.replace(/[-\\\/\\^$*+?.()|[\]{}#&;,]/g,"\\$&")};const sanitize=function(t){return t.replace(RegExp(regexp.tagSelector,"g"),"").replace(RegExp(regexp.unclosedTagSelector,"g"),"").replace(RegExp(regexp.unopenedTagSelector,"g"),"")};RegExp.prototype.execGlobal=function(t){let e,n=[],s=RegExp(this.source,this.flags);for(;null!==(e=s.exec(t));)n.push(e);return n};