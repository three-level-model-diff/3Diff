const diffType={mechanical:{id:"edit",ins:"INS",del:"DEL"},structural:{id:"structural",punctuation:"PUNCTUATION",textInsert:"TEXTINSERT",textDelete:"TEXTDELETE",wordchange:"WORDCHANGE",textReplace:"TEXTREPLACE",insert:"INSERT",delete:"DELETE",move:"MOVE",noop:"NOOP",wrap:"WRAP",unwrap:"UNWRAP",split:"SPLIT",join:"JOIN",replace:"REPLACE"},semantic:{id:"semantic"},newTextId:"new",oldTextId:"old"},algorithms={diffMatchPatch:"diff_match_patch"},regexp={punctuation:"^[\\!\\\"\\#\\$\\%\\&'\\(\\)\\*\\+\\,\\-\\.\\/\\:\\;\\=\\?\\@\\[\\]\\^\\_\\`\\{\\|\\}\\~ ]+[A-z]?$",wordchange:"^\\S*$",tagSelector:"<[.A-z]?[^(><.)]+>",unclosedTagSelector:"<[.A-z]?[^(><.)]+",unopenedTagSelector:"[.A-z]?[^(><.)]+>",textSelector:"[A-z\\s]*",lowercaseLetter:"[a-z]+",tagElements:"[<>/?]",splitJoin:"^[\\s]*<[.A-z]?[^(><.)]+><[.A-z]?[^(><.)]+>[\\s]*$",openingElement:'<[A-z]+[A-z\\/\\-\\d\\=\\"\\s\\:\\%\\.\\,\\(\\)\\{\\}\\!\\;]*>'},TBD="TBD",globalUser="SAURON";class DiffAlgorithmSelector{constructor(t,e,n){let s;switch(n){case algorithms.diffMatchPatch:s=new DiffMatchPatchAdapter(t,e);break;default:s=null}return s}}class Adapter{constructor(t,e){this.oldText=t,this.newText=e}makeDiff(t,e){this.threeDiff=new ThreeDiff(t,this.oldText,this.newText,e)}getMechanicalOperations(){return this.threeDiff.getMechanicalOperations()}getStructuralOperations(){return this.threeDiff.getStructuralOperations()}getSemanticOperations(){return this.threeDiff.getSemanticOperations()}getDiffHTML(){return this.threeDiff.getDiffHTML()}}class DiffMatchPatchAdapter extends Adapter{constructor(t,e){super(t,e);let n=new diff_match_patch;this.diffs=n.diff_main(t,e),n.diff_cleanupSemantic(this.diffs),this.patches=n.patch_make(this.diffs),this.html=n.diff_prettyHtml(this.diffs),this.runDiffAlgorithm()}runDiffAlgorithm(){this.makeDiff(this._getMechanicalOps(),this.html)}_getMechanicalOps(){let t=[];for(let e of this.patches){let n=e.start1,s=e.diffs;s.map((e,l)=>{if(l>0){let t=s[l-1];-1!==t[0]&&(n+=parseInt(t[1].length))}if(0!==e[0]){let s=1===e[0]?diffType.mechanical.ins:diffType.mechanical.del;t.push(new MechanicalDiff(s,e[1],n,t.length))}})}return t}}class Diff{constructor(t,e){this.id=this._setId(t,e)}_setId(t,e){let n=`${t}-`,s=4-(++e).toString().length;for(;s>0;)n+="0",s--;return n+e}}class MechanicalDiff extends Diff{constructor(t,e,n,s){super(diffType.mechanical.id,s),this.op=t,this.content=e,this.pos=n}getWord(t,e){let n=this._getText(t,e);let s=RegExp(`[A-z]*${RegExp.escape(this.content)}[A-z]*`,"g").execGlobal(n);for(const t of s){const e=t.index+t[0].length,n=this.pos+this.content.length;if(t.index<this.pos&&e>n)return t}return null}getEnclosingTag(t,e){let n=e.substring(this.pos,this.pos+this.content.length);/^[<>]+/.test(n)&&(n=e.substring(this.pos-this.content.length,this.pos));let s=RegExp(`<[A-z\\/\\-\\d\\=\\"\\s\\:\\%\\.\\,\\(\\)\\#]*${RegExp.escape(n)}[A-z\\/\\-\\d\\=\\"\\s\\:\\%\\.\\,\\(\\)\\#]*>`,"g").execGlobal(e);for(const t of s){let n=t.index+t[0].length;const s=this.pos+this.content.length;if(this.op===diffType.mechanical.del&&(n+=this.content.length),t.index<this.pos&&n>s){let n=this.getCssSelector(e,t);return n.path=`#newTextTemplate${n.path}`,document.querySelector(n.path)}}return null}getCssSelector(t,e){const n=t=>(t[0]=t[0].replace(/[<>\/]?/g,"").split(/\s/)[0],t.siblings=1,t),s=t.split(e[0])[0];let l=RegExp(regexp.openingElement,"g").execGlobal(s);e=n(e);let i=[];l.push(e),i.push(e),l=l.reverse();let r=s.substring(e.index,s.length);for(let t=1;t<l.length;t++){let e=n(l[t]);r=s.substring(e.index,l[t-1].index),RegExp(`</${e[0]}>`).test(r)||i.push(e)}(i=this.setParentsSiblings(i,s)).reverse();let o="";for(const t of i)o+=`>${t[0]}`,t.siblings>1&&(o+=`:nth-child(${t.siblings})`);return{index:i.splice(-1).pop().index,path:o}}setParentsSiblings(t,e){for(let n=1;n<t.length;n++){let s=t[n],l=t[n-1],i=e.substring(s.index,l.index);l.siblings+=RegExp(`</${l[0]}>`,"g").execGlobal(i).length}return t}_getText(t,e){return this.op===diffType.mechanical.ins?e:t}_getContexts(t){return{left:t.substring(0,this.pos),right:t.substring(this.op===diffType.mechanical.ins?this.pos+this.content.length:this.pos,t.length)}}}class StructuralDiff extends Diff{constructor(t,e,n=globalUser){super(diffType.structural.id,t),this.op=TBD,this.by=n,this.timestamp=Date.now(),this.items=[e]}setOperation(t){this.op=t}addItem(t){this.items.push(t)}}class ThreeDiff{constructor(t,e,n,s){this.listMechanicalOperations=t,this.listStructuralOperations=[],this.listSemanticOperations=[],this.oldText=e,this.newText=n,this.html=s,this._addTemplates(),this.structuralRules=[(t,e=null)=>null===e&&(!!/^[\s]+$/.test(t.content)&&diffType.structural.noop),(t,e=null)=>{if(null===e)return!1;let n=t.getEnclosingTag(this.oldText,this.newText),s=e.getEnclosingTag(this.oldText,this.newText);return null!==n&&null!==s&&(n.index===s.index&&(t.pos!==e.pos&&(t.content===e.content&&diffType.structural.noop)))},(t,e=null)=>null!==e&&(e.content.trim()===t.content.trim()&&e.pos!==t.pos&&t.op!==e.op&&diffType.structural.move),(t,e=null)=>{if(null===e)return!1;if(!RegExp(regexp.tagSelector).test(t.content)&&!RegExp(regexp.tagSelector).test(e.content)&&t.op===e.op)return!1;if(t.content.replace(RegExp(regexp.tagElements,"g"),"")!==e.content.replace(RegExp(regexp.tagElements,"g"),""))return!1;let n=t.op===diffType.mechanical.ins?this.newText:this.oldText,s=Math.min(t.pos+t.content.length,e.pos+e.content.length),l=Math.max(t.pos,e.pos);n.substring(s,l);return t.op===diffType.mechanical.ins?diffType.structural.wrap:diffType.structural.unwrap},(t,e=null)=>{if(null!==e)return!1;if(!RegExp(regexp.splitJoin).test(t.content))return!1;let n,s=[],l=RegExp(regexp.tagSelector,"g");for(;null!==(n=l.exec(t.content));)s.push(n[0]);return t.op===diffType.mechanical.ins?diffType.structural.split:diffType.structural.join},(t,e=null)=>{if(null===e)return!1;"edit-0027"===e.id&&console.log(e);let n=t.getEnclosingTag(this.oldText,this.newText),s=e.getEnclosingTag(this.oldText,this.newText);return null!==n&&null!==s&&(n===s&&diffType.structural.replace)},(t,e=null)=>{if(null!==e)return!1;return null!==t.getEnclosingTag(this.oldText,this.newText)&&diffType.structural.replace},(t,e=null)=>{if(null!==e)return!1;if(!RegExp(regexp.tagSelector).test(t.content))return!1;let n,s=[],l=RegExp(regexp.tagSelector,"g");for(;null!==(n=l.exec(t.content));)s.push(n[0]);if(s.length%2!=0)return!1;let i=s[0].replace(RegExp(regexp.tagElements,"g"),""),r=s[s.length-1].replace(RegExp(regexp.tagElements,"g"),"");if(i.split(/\s/)[0]!==r)return!1;let o=t.op===diffType.mechanical.ins?diffType.structural.insert:diffType.structural.delete;return!!RegExp(`^${regexp.textSelector}<${i}>.*</${r}>${regexp.textSelector}$`).test(t.content)&&o},(t,e=null)=>null!==e&&(t.pos===e.pos&&(t.op!==e.op&&(!(!RegExp(regexp.punctuation).test(t.content)||!RegExp(regexp.punctuation).test(e.content))&&diffType.structural.punctuation))),(t,e=null)=>!1,(t,e=null)=>{if(null!==e)return!1;let n=t.getWord(this.newText);return null!==n&&(!!RegExp(regexp.wordchange).test(n)&&diffType.structural.wordchange)},(t,e=null)=>{if(null===e)return!1;let n=t.getWord(this.newText),s=e.getWord(this.newText);return null!==n&&null!==n&&(""!==n&&""!==s&&(!(!RegExp(regexp.wordchange).test(n)||!RegExp(regexp.wordchange).test(n))&&(n===s&&diffType.structural.wordchange)))},(t,e=null)=>null!==e&&(t.content!==e.content&&(t.op!==e.op&&(t.pos===e.pos&&diffType.structural.textReplace))),(t,e=null)=>null===e&&(t.op===diffType.mechanical.ins?diffType.structural.textInsert:diffType.structural.textDelete)],this._executeStructuralAnalysis()}_addTemplates(){let t=document.createElement("div");t.id="oldTextTemplate",t.innerHTML=this.oldText;let e=document.createElement("div");e.id="newTextTemplate",e.innerHTML=this.oldText,document.body.appendChild(t),document.body.appendChild(e)}_executeStructuralAnalysis(){let t=this.listMechanicalOperations.slice(0);for(;t.length>0;){let e=!1,n=t.splice(0,1)[0],s=new StructuralDiff(this.listStructuralOperations.length,n);for(let l=0;l<t.length;l++){let i=t[l];for(let r of this.structuralRules){let o=r(n,i);if(this._checkRuleResulCorrectness(o)){s.setOperation(o),s.addItem(t.splice(l,1)[0]),e=!0,l--;break}}if(void 0!==s.op&&s.op!==diffType.structural.wordchange&&s.op!==diffType.structural.replace)break}if(!e)for(let t of this.structuralRules){let e=t(n);if(this._checkRuleResulCorrectness(e)){s.setOperation(e);break}}this.listStructuralOperations.push(s)}}_setOldsNews(){for(let t of this.listStructuralOperations)if(t.op===diffType.structural.replace){const e=this._getOldNewText(t);t.new=e.newText,t.old=e.oldText}else{const e=this._getOldNewText(t);t.new=e.newText,t.old=e.oldText}}_getOldNewText(t){let e=t.items,n=this._getContextBoundariesNew(this.newText,e[0],e[e.length-1]),s=n.leftContext;e.map((t,n)=>{let l=e[n+1];t.op===diffType.mechanical.ins?(s+=t.content,void 0!==l&&(s+=this.newText.substring(t.pos+t.content.length,l.pos))):void 0!==l&&(s+=this.newText.substring(t.pos,l.pos))}),s+=n.rightContext;let l=this._getContextBoundariesOld(this.oldText,e[0],e[e.length-1]).leftContext;return e.map((t,n)=>{let s=e[n+1];t.op===diffType.mechanical.ins?void 0!==s&&(l+=this.oldText.substring(t.pos,s.pos-t.content.length)):(l+=t.content,void 0!==s&&(l+=this.oldText.substring(t.pos+t.content.length,s.pos+t.content.length)))}),l+=n.rightContext,{newText:s,oldText:l}}_getContextBoundariesNew(t,e,n){const s=e.pos,l=n.pos+(n.op===diffType.mechanical.ins?n.content.length:0),i=s<30?0:30,r=l+30<t.length?l+30:t.length;let o=t.substring(i,s).split(/\s/),c=t.substring(l,r).split(/\s/);return{leftContext:o[o.length-1],rightContext:c[0]}}_getContextBoundariesOld(t,e,n){const s=e.pos,l=n.pos+(n.op===diffType.mechanical.del?n.content.length:0),i=s<10?0:10,r=l+10<t.length?l+10:t.length;let o=t.substring(i,s).split(/\s/),c=t.substring(l,r).split(/\s/);return{leftContext:o[o.length-1],rightContext:c[0]}}_checkRuleResulCorrectness(t){return!1!==t&&(null!==t&&void 0!==t)}getMechanicalOperations(){return this.listMechanicalOperations}getStructuralOperations(){return this.listStructuralOperations}getSemanticOperations(){return this.listSemanticOperations}getDiffHTML(){return this.html}}RegExp.escape=function(t){return t.replace(/[-\\\/\\^$*+?.()|[\]{}]/g,"\\$&")},RegExp.prototype.execGlobal=function(t){let e,n=[],s=RegExp(this.source,this.flags);for(;null!==(e=s.exec(t));)n.push(e);return n};