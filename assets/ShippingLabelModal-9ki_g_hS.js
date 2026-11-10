import{r as A,p as Se,a as Ae,c as x,o as Ue,f as m,e as p,h as s,d as Me,g as y,t as r,k,w as O,v as Z,i as g,F as G,j as ze,l as z,E as Ie}from"./vendor-vue-B2Dqwahp.js";import{u as le,r as ie}from"./vendor-firebase-BGywcYca.js";import{d as ae}from"./errorHandler-Cqh4DHGA.js";import{n as W,c as qe}from"./addressParser-qdX8JMWO.js";import Ve from"./CustomerAddressModal-ecqtUbpK.js";import{S as L}from"./vendor-sweetalert-DE6NlnlT.js";import{_ as We}from"./_plugin-vue_export-helper-DlAUqK2U.js";const Ye={class:"slm-modal"},Re={class:"slm-header no-print"},He={class:"slm-title"},Ke={class:"slm-count-badge"},Qe={class:"slm-controls no-print"},Ze={class:"slm-filter-group"},Ge={class:"slm-customer-selector"},Je={class:"slm-selector-header"},Xe={class:"slm-search-box"},et={class:"slm-quick-select-btns"},tt={class:"slm-chips-scroll"},nt=["onClick","title"],st={class:"chip-checkbox"},lt={class:"chip-name"},it={key:0,class:"chip-items"},at=["onClick","title"],ot={key:0,class:"chip-active-lbl"},dt=["onClick","title"],rt=["onClick","title"],ct={key:2,class:"chip-warn-tag",title:"ยังไม่มีที่อยู่"},pt={key:0,class:"slm-no-chips"},ut={class:"slm-options-row"},mt={class:"slm-select-wrap"},vt={class:"slm-orient-tabs"},ft={class:"slm-select-wrap"},ht={class:"slm-select-wrap"},gt={style:{display:"flex",gap:"8px","flex-wrap":"wrap"}},yt={key:0,class:"slm-sender-box"},bt={class:"slm-sender-grid"},kt={class:"slm-select-bar"},$t={style:{display:"flex","align-items":"center",gap:"12px","flex-wrap":"wrap"}},wt={class:"slm-check-all"},Ct=["checked"],_t={key:0,class:"slm-addr-counter"},xt={class:"cnt-item has"},St={key:0,class:"cnt-item missing"},At={style:{display:"flex",gap:"8px"}},zt=["disabled"],It={key:0,class:"slm-empty-state no-print"},Bt=["onClick"],Lt={class:"banner-text"},Tt={class:"highlight-label"},Dt=["onClick"],Pt={key:1,class:"label-main-grid"},Nt={class:"ls-sender-col"},Et={class:"ls-sender-info"},Ot={class:"ls-sender-name"},jt={class:"ls-sender-addr",style:{"white-space":"pre-line"}},Ft={class:"ls-sender-phone"},Ut={class:"ls-bottom-left"},Mt=["title"],qt=["onClick"],Vt=["onClick"],Wt={class:"ls-receiver-col"},Yt={class:"ls-receiver-name"},Rt={class:"ls-receiver-addr"},Ht={key:0,class:"ls-receiver-zip"},Kt={class:"zip-big"},Qt={class:"ls-receiver-phone"},Zt={key:2,class:"label-portrait-body"},Gt={class:"label-sender-block"},Jt={class:"sender-body"},Xt={class:"sender-name-line"},en={class:"sender-addr-line",style:{"white-space":"pre-line"}},tn={class:"sender-phone-line"},nn={class:"label-receiver-block"},sn={class:"receiver-body"},ln={class:"receiver-name"},an={class:"receiver-address"},on={key:0,class:"receiver-zipcode"},dn={class:"zip-num"},rn={class:"receiver-phone"},cn={class:"portrait-meta-bottom"},pn=["title"],un=["onClick"],mn=["onClick"],vn={class:"label-thankyou-footer"},fn={__name:"ShippingLabelModal",props:{customers:{type:Array,default:()=>[]},addressBook:{type:Object,default:()=>({})},initialSelectedId:{type:String,default:null}},emits:["close"],setup(ue){let T=null;const c=ue,$=A("unprinted"),I=A("landscape"),j=A("thermal-76x130"),F=A(localStorage.getItem("manowzab_label_font_scale")||"preview"),J=A(!1),f=A([]),B=A(""),D=A(null);function Be(){localStorage.setItem("manowzab_label_font_scale",F.value)}const me=x(()=>D.value?c.customers.find(n=>n.id===D.value.id)||D.value:null),u=A({name:localStorage.getItem("manowzab_sender_name")||"มะนาวแซ่บ",phone:localStorage.getItem("manowzab_sender_phone")||"095-155-5706",address:localStorage.getItem("manowzab_sender_address")||"191 หมู่3 ต.ขามใหญ่ อ.เมือง จ.อุบลราชธานี 34000",thankYouText:localStorage.getItem("manowzab_sender_thankyou")||"🙏 ขอบคุณที่อุดหนุนนะคะ ❤️"});Se(u,n=>{localStorage.setItem("manowzab_sender_name",n.name||""),localStorage.setItem("manowzab_sender_phone",n.phone||""),localStorage.setItem("manowzab_sender_address",n.address||""),localStorage.setItem("manowzab_sender_thankyou",n.thankYouText||"")},{deep:!0});function U(n){if(!n)return 1/0;const e=new Date;e.setHours(0,0,0,0);const t=new Date(n);return t.setHours(0,0,0,0),Math.ceil((t-e)/(1e3*60*60*24))}const S=x(()=>[...c.customers.filter(e=>c.initialSelectedId&&e.id===c.initialSelectedId?!0:e&&e.status!=="done"&&e.deliveryDate&&typeof e.deliveryDate=="string"&&e.deliveryDate.trim()!=="")].sort((e,t)=>{const a=U(e.deliveryDate),i=U(t.deliveryDate);return a!==i?a-i:(e.deliveryDate||"").localeCompare(t.deliveryDate||"")})),Le=x(()=>S.value.filter(n=>!n.labelPrinted).length),ve=x(()=>S.value.filter(n=>U(n.deliveryDate)===0).length),fe=x(()=>S.value.filter(n=>U(n.deliveryDate)===1).length),Te=x(()=>S.value.length),w=x(()=>{let n=S.value;if($.value==="unprinted"?n=S.value.filter(e=>!e.labelPrinted):$.value==="today"?n=S.value.filter(e=>U(e.deliveryDate)===0):$.value==="pack-tonight"&&(n=S.value.filter(e=>U(e.deliveryDate)===1)),c.initialSelectedId){const e=S.value.find(t=>t.id===c.initialSelectedId);e&&!n.some(t=>t.id===c.initialSelectedId)&&(n=[e,...n])}if(B.value.trim()){const e=B.value.trim().toLowerCase();n=n.filter(t=>{const a=(t.name||"").toLowerCase(),i=(t.recipientName||"").toLowerCase(),l=(q(t)||"").toLowerCase();return a.includes(e)||i.includes(e)||l.includes(e)})}return n}),b=x(()=>w.value.filter(n=>f.value.includes(n.id))),he=x(()=>b.value.filter(n=>!!q(n)).length),ge=x(()=>b.value.length-he.value),De=x(()=>w.value.length>0&&f.value.length===w.value.length);Se(()=>c.initialSelectedId,n=>{n?($.value="all-requested",f.value=[n],B.value=""):($.value="all-requested",f.value=w.value.map(e=>e.id))},{immediate:!0}),Ae(()=>{c.initialSelectedId?($.value="all-requested",f.value=[c.initialSelectedId],B.value=""):($.value="all-requested",f.value=w.value.map(n=>n.id))});function P(n){$.value=n,f.value=w.value.map(e=>e.id)}function Pe(n){n?f.value=w.value.map(e=>e.id):f.value=[]}function Ne(n){const e=f.value.indexOf(n);e>-1?f.value.splice(e,1):f.value.push(n)}async function Ee(n){const e=!n.labelPrinted;try{await le(ie(ae,`delivery_customers/${n.id}`),{labelPrinted:e,labelPrintedAt:e?Date.now():null}),L.fire({icon:"success",title:e?`ทำเครื่องหมาย "${n.name}" พิมพ์แล้ว`:`ยกเลิกสถานะพิมพ์แล้วของ "${n.name}"`,toast:!0,position:"top-end",timer:1500,showConfirmButton:!1})}catch(t){console.error("Error updating printed status:",t)}}function M(n){if(!n)return[];const e=W(n.name).replace(/[.#$[\]/]/g,"_"),t=n.addresses,a=c.addressBook&&c.addressBook[e]?.addresses,i=t||a;let l=[];if(Array.isArray(i)?l=i.filter(Boolean):i&&typeof i=="object"&&(l=Object.values(i).filter(Boolean)),l.length>0)return l;if(n.address&&n.address.trim()){const o=R(n);return o&&o.address?[o]:[]}return[]}function Y(n){return M(n).length}function X(n){if(!n)return"";const e=M(n);if(!e||e.length===0)return"";if(n.selectedAddressId){const t=e.find(a=>a.id===n.selectedAddressId);if(t)return t.label||(t.recipientName?`${t.recipientName}`:"")}if(n.address&&n.address.trim()){const t=n.address.trim(),a=e.find(i=>i.address&&i.address.trim()===t);if(a)return a.label||(a.recipientName?`${a.recipientName}`:"")}return e[0]?.label||""}function R(n){if(n.address)return{recipientName:n.recipientName||"",phone:n.phone||"",address:n.address||"",postalCode:n.postalCode||""};const e=W(n.name).replace(/[.#$[\]/]/g,"_");return c.addressBook&&c.addressBook[e]?c.addressBook[e]:{recipientName:"",phone:"",address:"",postalCode:""}}function H(n){if(n.recipientName&&n.recipientName.trim())return n.recipientName.trim();const e=R(n);return e&&e.recipientName&&e.recipientName.trim()?e.recipientName.trim():n.name}function K(n){return R(n).phone}function q(n){return R(n).address}function N(n){const e=R(n);if(e.postalCode)return e.postalCode;const t=(e.address||"").match(/\b[1-9]\d{4}\b(?!\/|\d)/);return t?t[0]:""}function oe(n){return qe({rawAddress:q(n)||"",recipientName:H(n),phone:K(n),postalCode:N(n)})}function de(n,e=15){const t=(n?.name||"-").trim();return t.length<=e?t:t.slice(0,e).trim()+"…"}function V(n){if(!n)return"";if(n.paymentType){const d=String(n.paymentType).trim().toLowerCase();if(d==="cod"||d==="ปลายทาง"||d==="เก็บเงินปลายทาง"||d==="เก็บปลายทาง")return"cod";if(d==="transfer"||d==="โอน"||d==="โอนเงิน")return"transfer"}const e=W(n.name).replace(/[.#$[\]/]/g,"_"),t=c.addressBook&&e?c.addressBook[e]:null;if(t&&t.paymentType){const d=String(t.paymentType).trim().toLowerCase();if(d==="cod"||d==="ปลายทาง"||d==="เก็บเงินปลายทาง"||d==="เก็บปลายทาง")return"cod";if(d==="transfer"||d==="โอน"||d==="โอนเงิน")return"transfer"}const a=M(n),i=n.selectedAddressId?a.find(d=>d.id===n.selectedAddressId):a[0];if(i&&i.paymentType){const d=String(i.paymentType).trim().toLowerCase();if(d==="cod"||d==="ปลายทาง"||d==="เก็บเงินปลายทาง"||d==="เก็บปลายทาง")return"cod";if(d==="transfer"||d==="โอน"||d==="โอนเงิน")return"transfer"}const l=(n.note||"").toLowerCase(),o=(n.address||"").toLowerCase();return l.includes("cod")||l.includes("ปลายทาง")||l.includes("เก็บเงิน")||o.includes("cod")||o.includes("ปลายทาง")?"cod":""}function Q(n){const e=V(n);if(e==="cod"){const t=(n?.note||"").match(/(?:cod|ปลายทาง)\s*[:=]?\s*(\d+)/i);return t&&t[1]?`COD (${t[1]}฿)`:"COD"}return e==="transfer"?"โอน":"ยังไม่ระบุ"}async function re(n){if(!n)return;const e=V(n),t=e==="cod"?"transfer":e==="transfer"?"cod":"transfer";n.paymentType=t;const a=Date.now(),i=W(n.name).replace(/[.#$[\]/]/g,"_"),l={[`delivery_customers/${n.id}/paymentType`]:t,[`delivery_customers/${n.id}/updatedAt`]:a};i&&(l[`address_book/${i}/paymentType`]=t,l[`address_book/${i}/name`]=n.name.trim(),l[`address_book/${i}/updatedAt`]=a,c.addressBook&&c.addressBook[i]&&(c.addressBook[i].paymentType=t));const o=M(n);if(o.length>0){const d=o.map(C=>({...C,paymentType:n.selectedAddressId&&C.id===n.selectedAddressId||o.length===1?t:C.paymentType||t}));l[`delivery_customers/${n.id}/addresses`]=d,i&&(l[`address_book/${i}/addresses`]=d)}try{await le(ie(ae),l),L.fire({icon:"success",title:`บันทึกรูปแบบ "${n.name}" เป็น "${t==="cod"?"COD":"โอน"}" ไว้ในประวัติลูกค้าแล้ว`,toast:!0,position:"top-end",timer:1500,showConfirmButton:!1})}catch(d){console.error("Error toggling paymentType:",d)}}function ye(n){if(!n)return"";if(n.contactChannel){const l=String(n.contactChannel).trim().toLowerCase();if(l==="lineoa"||l==="line_oa"||l==="line-oa")return"lineoa";if(l==="phone"||l==="tel"||l==="โทร"||l==="โทรศัพท์")return"phone";if(l==="line")return"line"}const e=W(n.name).replace(/[.#$[\]/]/g,"_"),t=c.addressBook&&e?c.addressBook[e]:null;if(t&&t.contactChannel){const l=String(t.contactChannel).trim().toLowerCase();if(l==="lineoa"||l==="line_oa"||l==="line-oa")return"lineoa";if(l==="phone"||l==="tel"||l==="โทร"||l==="โทรศัพท์")return"phone";if(l==="line")return"line"}const a=M(n),i=n.selectedAddressId?a.find(l=>l.id===n.selectedAddressId):a[0];if(i&&i.contactChannel){const l=String(i.contactChannel).trim().toLowerCase();if(l==="lineoa"||l==="line_oa"||l==="line-oa")return"lineoa";if(l==="phone"||l==="tel"||l==="โทร"||l==="โทรศัพท์")return"phone";if(l==="line")return"line"}return""}function ce(n){const e=ye(n);return e==="lineoa"?"LineOA":e==="phone"?"โทร":e==="line"?"Line":"-"}async function be(n){if(!n)return;const e=ye(n),t=e==="line"?"lineoa":e==="lineoa"?"phone":"line";n.contactChannel=t;const a=Date.now(),i=W(n.name).replace(/[.#$[\]/]/g,"_"),l={[`delivery_customers/${n.id}/contactChannel`]:t,[`delivery_customers/${n.id}/updatedAt`]:a};i&&(l[`address_book/${i}/contactChannel`]=t,l[`address_book/${i}/name`]=n.name.trim(),l[`address_book/${i}/updatedAt`]=a,c.addressBook&&c.addressBook[i]&&(c.addressBook[i].contactChannel=t));const o=M(n);if(o.length>0){const d=o.map(C=>({...C,contactChannel:n.selectedAddressId&&C.id===n.selectedAddressId||o.length===1?t:C.contactChannel||t}));l[`delivery_customers/${n.id}/addresses`]=d,i&&(l[`address_book/${i}/addresses`]=d)}try{await le(ie(ae),l);const d=t==="lineoa"?"LineOA":t==="phone"?"โทรศัพท์":"Line";L.fire({icon:"success",title:`บันทึกช่องทางติดต่อ "${n.name}" เป็น "${d}" เรียบร้อย`,toast:!0,position:"top-end",timer:1500,showConfirmButton:!1})}catch(d){console.error("Error toggling contactChannel:",d)}}function Oe(){if(b.value.length===0)return;const n=document.getElementById("manowzab-label-print-frame");n&&n.remove();const e=I.value==="landscape";let t=76,a=130;j.value==="thermal-100x150"?(t=100,a=150):j.value==="thermal-80x100"&&(t=80,a=100);const i=e?`${a}mm`:`${t}mm`,l=e?`${t}mm`:`${a}mm`,o=document.createElement("iframe");o.id="manowzab-label-print-frame",o.style.position="fixed",o.style.left="-9999px",o.style.top="0",o.style.width=i,o.style.height=l,o.style.border="0",o.style.visibility="hidden",o.style.pointerEvents="none",o.style.zIndex="-9999",document.body.appendChild(o);const d=u.value.name||"มะนาวแซ่บ",C=u.value.phone||"095-155-5706",ee=(u.value.address||"191 หมู่3 ต.ขามใหญ่ อ.เมือง จ.อุบลราชธานี 34000").replace(/\n/g,"<br>"),te=u.value.thankYouText||"🙏 ขอบคุณที่อุดหนุนนะคะ ❤️",pe=F.value==="compact"?.9:F.value==="large"?1.2:1,h=v=>`${(v*pe).toFixed(1)}pt`,Fe=b.value.map(v=>{const _=H(v),E=oe(v)||"⚠️ ยังไม่มีที่อยู่จัดส่ง",se=N(v),ke=K(v)||"-",$e=Q(v),we=de(v),Ce=ce(v),_e=_.length>26?"name-long":"",xe=E.length>130?"addr-xlong":E.length>85?"addr-long":"";return e?`
          <div class="print-page">
            <div class="print-card landscape">
              <div class="card-grid">
                <!-- Left: Sender + Bottom-Left System Info -->
                <div class="ls-sender">
                  <div class="sender-top-info">
                    <div class="sender-name">${d}</div>
                    <div class="sender-addr">${ee}</div>
                    <div class="sender-phone">โทร. ${C}</div>
                  </div>

                  <!-- 📌 Bottom-Left Meta on Printed Label (Plain Text) -->
                  <div class="ls-meta-bottom">
                    <div class="meta-system-name">${we} (${Ce})</div>
                    <div class="meta-payment-row">${$e}</div>
                  </div>
                </div>

                <!-- Right: Receiver -->
                <div class="ls-receiver">
                  <div class="receiver-name ${_e}">${_}</div>
                  <div class="receiver-addr ${xe}">${E}</div>
                  ${se?`<div class="receiver-zip">${se}</div>`:""}
                  <div class="receiver-phone">โทร ${ke}</div>
                </div>
              </div>

              <!-- Thank you footer -->
              <div class="card-footer">${te}</div>
            </div>
          </div>
        `:`
          <div class="print-page">
            <div class="print-card portrait">
              <div class="port-sender">
                <div class="sender-name">${d}</div>
                <div class="sender-addr">${ee}</div>
                <div class="sender-phone">โทร. ${C}</div>
              </div>

              <div class="port-receiver">
                <div class="receiver-name ${_e}">${_}</div>
                <div class="receiver-addr ${xe}">${E}</div>
                ${se?`<div class="receiver-zip">${se}</div>`:""}
                <div class="receiver-phone">โทร ${ke}</div>
              </div>

              <!-- Portrait Bottom-Left Meta (Plain Text) -->
              <div class="port-meta-bottom">
                <div class="meta-system-name">${we} (${Ce})</div>
                <div class="meta-payment-row">${$e}</div>
              </div>

              <div class="card-footer">${te}</div>
            </div>
          </div>
        `}).join(""),ne=o.contentWindow.document;ne.open(),ne.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>พิมพ์ใบปะหน้าพัสดุ - ${d}</title>
        <link id="label-font-link" href="https://fonts.googleapis.com/css2?family=Kanit:wght@400;500;600;700&family=Sarabun:wght@500;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page {
            size: ${i} ${l};
            margin: 0mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          html, body {
            width: ${i};
            margin: 0;
            padding: 0;
            background: #ffffff;
            font-family: 'Sarabun', 'Kanit', 'Leelawadee UI', 'Tahoma', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            text-rendering: optimizeLegibility;
            -webkit-font-smoothing: antialiased;
          }
          .print-page {
            width: ${i};
            height: ${l};
            max-width: ${i};
            max-height: ${l};
            page-break-after: always;
            break-after: page;
            page-break-inside: avoid;
            break-inside: avoid;
            padding: 0;
            margin: 0;
            box-sizing: border-box;
            display: block;
            overflow: hidden;
          }
          .print-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .print-card {
            width: 100%;
            height: 100%;
            border: none;
            border-radius: 0;
            padding: 3.5mm 5.5mm 1.2mm 5.5mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: #ffffff;
            color: #000000;
            box-sizing: border-box;
            overflow: hidden;
          }
          .card-grid {
            display: flex;
            width: 100%;
            gap: 4.5mm;
            flex: 1;
            min-height: 0;
          }
          .ls-sender {
            width: 33%;
            font-size: ${h(8.5)};
            line-height: 1.35;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding-top: 0.5mm;
            padding-bottom: 1.5mm;
          }
          .sender-top-info {
            display: flex;
            flex-direction: column;
          }
          .sender-name {
            font-size: ${h(10)};
            font-weight: 700;
            margin-bottom: 2px;
            line-height: 1.25;
          }
          .sender-addr {
            font-size: ${h(8.5)};
            font-weight: 500;
            margin-top: 2px;
            line-height: 1.35;
          }
          .sender-phone {
            font-size: ${h(8.5)};
            font-weight: 600;
            margin-top: 3px;
          }
          .ls-meta-bottom {
            margin-top: auto;
            padding-top: 1.5mm;
            display: flex;
            flex-direction: column;
            gap: 0.5mm;
            font-size: ${h(9)};
            line-height: 1.25;
          }
          .meta-system-name {
            font-size: ${h(9)};
            color: #000000;
            font-weight: 700;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 39mm;
          }
          .meta-payment-row {
            font-size: ${h(9.5)};
            color: #000000;
            font-weight: 800;
            letter-spacing: 0.3px;
          }
          .ls-receiver {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            padding-bottom: 5.5mm;
            padding-top: 0;
            padding-left: 0;
            word-break: break-word;
            overflow-wrap: break-word;
            min-width: 0;
          }
          .port-sender {
            font-size: ${h(8.5)};
            line-height: 1.35;
          }
          .port-receiver {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            padding-bottom: 7mm;
            padding-top: 0;
            word-break: break-word;
            overflow-wrap: break-word;
          }
          .port-meta-bottom {
            margin-top: auto;
            padding-top: 1.5mm;
            padding-bottom: 1.5mm;
            display: flex;
            flex-direction: column;
            gap: 0.5mm;
            font-size: ${h(9)};
            line-height: 1.25;
          }
          .port-meta-bottom .meta-system-name {
            max-width: 64mm;
          }
          .receiver-name {
            font-size: ${h(13.5)};
            font-weight: 700;
            line-height: 1.25;
            margin-bottom: 3px;
          }
          .receiver-name.name-long {
            font-size: ${h(11.5)};
          }
          .receiver-addr {
            font-size: ${h(11)};
            line-height: 1.38;
            font-weight: 600;
          }
          .receiver-addr.addr-long {
            font-size: ${h(9.8)};
            line-height: 1.34;
          }
          .receiver-addr.addr-xlong {
            font-size: ${h(8.8)};
            line-height: 1.3;
          }
          .receiver-zip {
            margin-top: 3px;
            font-size: ${h(14)};
            font-weight: 800;
            letter-spacing: 2px;
            line-height: 1.15;
          }
          .receiver-phone {
            font-size: ${h(11)};
            font-weight: 700;
            margin-top: 3px;
            line-height: 1.25;
          }
          .card-footer {
            text-align: center;
            font-size: ${h(9)};
            font-weight: 600;
            margin-top: auto;
            padding-top: 0;
            padding-bottom: 0.5mm;
          }
        </style>
      </head>
      <body>
        ${Fe}
      </body>
    </html>
  `),ne.close(),T&&clearTimeout(T),T=setTimeout(async()=>{try{const v=ne.getElementById("label-font-link");v&&!v.sheet&&await Promise.race([new Promise(_=>{v.addEventListener("load",_,{once:!0}),v.addEventListener("error",_,{once:!0})}),new Promise(_=>setTimeout(_,800))]),o.contentWindow&&o.contentWindow.document.fonts&&await Promise.race([o.contentWindow.document.fonts.ready,new Promise(_=>setTimeout(_,800))])}catch{}o.contentWindow.focus(),o.contentWindow.print();try{const v={},_=Date.now();b.value.forEach(E=>{v[`delivery_customers/${E.id}/labelPrinted`]=!0,v[`delivery_customers/${E.id}/labelPrintedAt`]=_}),Object.keys(v).length>0&&await le(ie(ae),v)}catch(v){console.error("Error auto-updating labelPrinted status:",v)}T=null},150)}Ue(()=>{T&&(clearTimeout(T),T=null);const n=document.getElementById("manowzab-label-print-frame");n&&n.remove(),typeof L<"u"&&L.isVisible()&&L.close()});function je(){if(b.value.length===0){L.fire({icon:"warning",title:"ไม่มีรายการที่เลือก",text:"กรุณาเลือกรายการลูกค้าที่ต้องการส่งออกก่อนครับ"});return}const n=[["ลำดับ","ชื่อผู้รับ (พิมพ์บนกล่อง)","ชื่อในระบบ (CF)","รูปแบบการส่ง","เบอร์โทร","ที่อยู่","รหัสไปรษณีย์","จำนวนสินค้า","รอบส่ง","โน้ต","ผู้ส่ง","เบอร์ผู้ส่ง","ที่อยู่ผู้ส่ง"]];b.value.forEach((o,d)=>{const C=H(o)||"",ee=K(o)||"",te=q(o)||"",pe=N(o)||"",h=Q(o);n.push([d+1,`"${C.replace(/"/g,'""')}"`,`"${(o.name||"").replace(/"/g,'""')}"`,`"${h}"`,`"${ee}"`,`"${te.replace(/"/g,'""')}"`,`"${pe}"`,o.itemCount||0,o.deliveryDate||"",`"${(o.note||"").replace(/"/g,'""')}"`,`"${(u.value.name||"").replace(/"/g,'""')}"`,`"${(u.value.phone||"").replace(/"/g,'""')}"`,`"${(u.value.address||"").replace(/"/g,'""')}"`])});const e="\uFEFF"+n.map(o=>o.join(",")).join(`
`),t=new Blob([e],{type:"text/csv;charset=utf-8;"}),a=URL.createObjectURL(t),i=document.createElement("a"),l=new Date().toISOString().split("T")[0];i.setAttribute("href",a),i.setAttribute("download",`รายการที่อยู่จัดส่ง_130x76_${l}.csv`),document.body.appendChild(i),i.click(),document.body.removeChild(i),L.fire({icon:"success",title:"ส่งออกไฟล์สำเร็จ!",html:`
      <div style="text-align: left; font-size: 0.9em; line-height: 1.6;">
        ดาวน์โหลดไฟล์ <b>.csv</b> เรียบร้อยแล้ว<br>
        สามารถนำไฟล์นี้ไปกดเปิดในแอปเครื่องพิมพ์ (ปุ่ม <b>Excel</b>) เพื่อพิมพ์สติ๊กเกอร์รวดเดียวได้เลยครับ!
      </div>
    `,confirmButtonColor:"#3b82f6"})}return Ae(()=>{ve.value>0?P("today"):fe.value>0?P("pack-tonight"):P("all-requested")}),(n,e)=>(p(),m("div",{class:"slm-overlay",onClick:e[21]||(e[21]=z(t=>n.$emit("close"),["self"]))},[s("div",Ye,[s("div",Re,[s("div",He,[e[22]||(e[22]=s("span",null,"🏷️ ใบปะหน้าพัสดุ 130x76 mm (แนวนอน)",-1)),s("span",Ke,r(b.value.length)+" รายการ",1)]),s("button",{class:"slm-close-btn",onClick:e[0]||(e[0]=t=>n.$emit("close")),title:"ปิด"},[...e[23]||(e[23]=[s("i",{class:"fa-solid fa-xmark"},null,-1)])])]),s("div",Qe,[s("div",Ze,[s("button",{class:k(["slm-filter-btn",{active:$.value==="unprinted"}]),onClick:e[1]||(e[1]=t=>P("unprinted"))}," ⏳ ยังไม่พิมพ์ ("+r(Le.value)+") ",3),s("button",{class:k(["slm-filter-btn",{active:$.value==="today"}]),onClick:e[2]||(e[2]=t=>P("today"))}," 🚨 ส่งวันนี้ ("+r(ve.value)+") ",3),s("button",{class:k(["slm-filter-btn",{active:$.value==="pack-tonight"}]),onClick:e[3]||(e[3]=t=>P("pack-tonight"))}," 📦 แพ็คคืนนี้ ("+r(fe.value)+") ",3),s("button",{class:k(["slm-filter-btn",{active:$.value==="all-requested"}]),onClick:e[4]||(e[4]=t=>P("all-requested"))}," 🌐 ทั้งหมดที่รอส่ง ("+r(Te.value)+") ",3)]),s("div",Ge,[s("div",Je,[s("div",Xe,[e[24]||(e[24]=s("i",{class:"fa-solid fa-magnifying-glass slm-search-icon"},null,-1)),O(s("input",{type:"text","onUpdate:modelValue":e[5]||(e[5]=t=>B.value=t),class:"slm-search-input",placeholder:"🔍 ค้นหาชื่อลูกค้า / ผู้รับ (เช่น หนิง, ปิยะวาท)..."},null,512),[[Z,B.value]]),B.value?(p(),m("button",{key:0,class:"slm-clear-search",onClick:e[6]||(e[6]=t=>B.value="")},"✕")):y("",!0)]),s("div",et,[s("button",{class:"slm-mini-btn",onClick:e[7]||(e[7]=t=>f.value=w.value.map(a=>a.id))},[...e[25]||(e[25]=[s("i",{class:"fa-solid fa-check-double"},null,-1),g(" เลือกทั้งหมด ",-1)])]),s("button",{class:"slm-mini-btn",onClick:e[8]||(e[8]=t=>f.value=[])},[...e[26]||(e[26]=[s("i",{class:"fa-solid fa-xmark"},null,-1),g(" ยกเลิกทั้งหมด ",-1)])]),s("button",{class:"slm-mini-btn highlight",onClick:e[9]||(e[9]=t=>f.value=w.value.filter(a=>!a.labelPrinted).map(a=>a.id))},[...e[27]||(e[27]=[s("i",{class:"fa-solid fa-filter"},null,-1),g(" เฉพาะที่ยังไม่พิมพ์ ",-1)])])])]),s("div",tt,[(p(!0),m(G,null,ze(w.value,t=>(p(),m("div",{key:t.id,class:k(["slm-cust-chip",{selected:f.value.includes(t.id),printed:t.labelPrinted,"no-address":!q(t)}]),onClick:a=>Ne(t.id),title:`คลิกเพื่อ ${f.value.includes(t.id)?"ยกเลิก":"เลือก"} ${t.name}`},[s("span",st,[s("i",{class:k(["fa-solid",f.value.includes(t.id)?"fa-square-check":"fa-square"])},null,2)]),s("span",lt,r(t.name),1),t.itemCount?(p(),m("span",it,"("+r(t.itemCount)+" ชิ้น)",1)):y("",!0),Y(t)>1?(p(),m("span",{key:1,class:"chip-multi-addr-tag",onClick:z(a=>D.value=t,["stop"]),title:`ลูกค้ารายนี้มี ${Y(t)} ที่อยู่ (เลือก: ${X(t)||"ที่อยู่นี้"}) — คลิกเพื่อเปลี่ยนที่อยู่จัดส่ง`},[e[28]||(e[28]=s("i",{class:"fa-solid fa-layer-group"},null,-1)),s("span",null,r(Y(t))+" ที่อยู่",1),X(t)?(p(),m("span",ot,": "+r(X(t)),1)):y("",!0)],8,at)):y("",!0),s("span",{class:k(["chip-payment-tag",V(t)==="cod"?"is-cod":V(t)==="transfer"?"is-transfer":"is-unspecified"]),onClick:z(a=>re(t),["stop"]),title:`รูปแบบจัดส่ง: ${Q(t)} (คลิกเพื่อสลับระหว่าง โอน / COD)`},[V(t)==="cod"?(p(),m(G,{key:0},[g("💵 COD")],64)):V(t)==="transfer"?(p(),m(G,{key:1},[g("💳 โอน")],64)):(p(),m(G,{key:2},[g("❓ ยังไม่ระบุ")],64))],10,dt),s("span",{class:k(["chip-status-tag",t.labelPrinted?"is-printed":"is-unprinted"]),onClick:z(a=>Ee(t),["stop"]),title:t.labelPrinted?"พิมพ์แล้ว (คลิกเพื่อเปลี่ยนเป็นยังไม่พิมพ์)":"ยังไม่พิมพ์ (คลิกเพื่อเปลี่ยนเป็นพิมพ์แล้ว)"},[s("i",{class:k(t.labelPrinted?"fa-solid fa-circle-check":"fa-solid fa-print")},null,2),g(" "+r(t.labelPrinted?"พิมพ์แล้ว":"ยังไม่พิมพ์"),1)],10,rt),q(t)?y("",!0):(p(),m("span",ct," ⚠️ รอที่อยู่ "))],10,nt))),128)),w.value.length===0?(p(),m("div",pt," ไม่พบรายชื่อในหมวดนี้ ")):y("",!0)])]),s("div",ut,[s("div",mt,[e[29]||(e[29]=s("label",null,[s("i",{class:"fa-solid fa-rotate"}),g(" ทิศทาง:")],-1)),s("div",vt,[s("button",{class:k(["slm-orient-btn",{active:I.value==="landscape"}]),onClick:e[10]||(e[10]=t=>I.value="landscape")}," 🔄 แนวนอน (130x76mm) ",2),s("button",{class:k(["slm-orient-btn",{active:I.value==="portrait"}]),onClick:e[11]||(e[11]=t=>I.value="portrait")}," ↕️ แนวตั้ง (76x130mm) ",2)])]),s("div",ft,[e[31]||(e[31]=s("label",null,[s("i",{class:"fa-solid fa-scroll"}),g(" ขนาดฉลาก:")],-1)),O(s("select",{"onUpdate:modelValue":e[12]||(e[12]=t=>j.value=t),class:"slm-select"},[...e[30]||(e[30]=[s("option",{value:"thermal-76x130"},"สติ๊กเกอร์ 76 x 130 mm (มาตรฐานของคุณ)",-1),s("option",{value:"thermal-100x150"},'สติ๊กเกอร์ 100 x 150 mm (4x6")',-1),s("option",{value:"thermal-80x100"},"สติ๊กเกอร์ 80 x 100 mm",-1),s("option",{value:"a4-grid"},"กระดาษ A4 (สติ๊กเกอร์ 2 คอลัมน์)",-1)])],512),[[Ie,j.value]])]),s("div",ht,[e[33]||(e[33]=s("label",null,[s("i",{class:"fa-solid fa-text-height"}),g(" ขนาดตัวหนังสือ:")],-1)),O(s("select",{"onUpdate:modelValue":e[13]||(e[13]=t=>F.value=t),class:"slm-select",onChange:Be},[...e[32]||(e[32]=[s("option",{value:"preview"},"พอดีตามพรีวิว (แนะนำ)",-1),s("option",{value:"compact"},"กะทัดรัด (ย่อ -10%)",-1),s("option",{value:"large"},"ตัวใหญ่ (+20%)",-1)])],544),[[Ie,F.value]])]),s("div",gt,[s("button",{class:"slm-export-excel-btn",onClick:je,title:"ส่งออกไฟล์เพื่อนำเข้าไปเปิดในแอปเครื่องพิมพ์"},[...e[34]||(e[34]=[s("i",{class:"fa-solid fa-file-excel"},null,-1),g(" ส่งออก Excel เข้าแอปปริ้นเตอร์ ",-1)])]),s("button",{class:"slm-toggle-sender-btn",onClick:e[14]||(e[14]=t=>J.value=!J.value)},[e[35]||(e[35]=s("i",{class:"fa-solid fa-store"},null,-1)),g(" "+r(J.value?"ซ่อนข้อมูลร้าน":"แก้ไขข้อมูลร้านผู้ส่ง"),1)])])]),J.value?(p(),m("div",yt,[e[36]||(e[36]=s("div",{class:"slm-sender-title"},"🏠 ข้อมูลผู้ส่งและข้อความขอบคุณ (บันทึกจำไว้ในเครื่องอัตโนมัติ)",-1)),s("div",bt,[O(s("input",{type:"text","onUpdate:modelValue":e[15]||(e[15]=t=>u.value.name=t),class:"slm-input",placeholder:"ชื่อร้าน (เช่น มะนาวแซ่บ)"},null,512),[[Z,u.value.name]]),O(s("input",{type:"text","onUpdate:modelValue":e[16]||(e[16]=t=>u.value.phone=t),class:"slm-input",placeholder:"เบอร์โทรผู้ส่ง"},null,512),[[Z,u.value.phone]]),O(s("input",{type:"text","onUpdate:modelValue":e[17]||(e[17]=t=>u.value.address=t),class:"slm-input slm-col-span",placeholder:"ที่อยู่ผู้ส่ง (บ้านเลขที่ ตำบล อำเภอ จังหวัด รหัสไปรษณีย์)"},null,512),[[Z,u.value.address]]),O(s("input",{type:"text","onUpdate:modelValue":e[18]||(e[18]=t=>u.value.thankYouText=t),class:"slm-input slm-col-span",placeholder:"ข้อความขอบคุณท้ายใบปะหน้า (เช่น 🙏 ขอบคุณที่อุดหนุนนะคะ ❤️)"},null,512),[[Z,u.value.thankYouText]])])])):y("",!0),s("div",kt,[s("div",$t,[s("label",wt,[s("input",{type:"checkbox",checked:De.value,onChange:e[19]||(e[19]=t=>Pe(t.target.checked))},null,40,Ct),s("span",null,"เลือก "+r(f.value.length)+" จาก "+r(w.value.length)+" คน",1)]),b.value.length>0?(p(),m("span",_t,[s("span",xt,[e[37]||(e[37]=s("i",{class:"fa-solid fa-circle-check"},null,-1)),g(" มีที่อยู่ "+r(he.value),1)]),ge.value>0?(p(),m("span",St,[e[38]||(e[38]=s("i",{class:"fa-solid fa-circle-exclamation"},null,-1)),g(" รอที่อยู่ "+r(ge.value),1)])):y("",!0)])):y("",!0)]),s("div",At,[s("button",{class:"btn btn-primary slm-print-btn",onClick:Oe,disabled:b.value.length===0},[e[39]||(e[39]=s("i",{class:"fa-solid fa-print"},null,-1)),g(" สั่งพิมพ์ใบปะหน้า ("+r(b.value.length)+" ใบ) ",1)],8,zt)])])]),s("div",{class:k(["slm-preview-area",["paper-"+j.value,"mode-"+I.value]])},[b.value.length===0?(p(),m("div",It,[...e[40]||(e[40]=[s("i",{class:"fa-solid fa-box-open slm-empty-icon"},null,-1),s("div",null,"ไม่มีรายการที่เลือกพิมพ์ (กรุณาคลิกเลือกรายชื่อลูกค้าด้านบน)",-1)])])):y("",!0),(p(!0),m(G,null,ze(b.value,t=>(p(),m("div",{key:t.id,class:k(["shipping-label-card",["label-"+j.value,I.value==="landscape"?"layout-landscape":"layout-portrait","font-scale-"+F.value]])},[Y(t)>1?(p(),m("div",{key:0,class:"label-multi-addr-banner no-print",onClick:a=>D.value=t,title:"คลิกเพื่อสลับหรือเลือกที่อยู่จัดส่ง"},[s("div",Lt,[e[43]||(e[43]=s("i",{class:"fa-solid fa-layer-group"},null,-1)),s("span",null,[e[41]||(e[41]=g("มี ",-1)),s("b",null,r(Y(t))+" ที่อยู่",1),e[42]||(e[42]=g(" • กำลังเลือกส่งที่: ",-1)),s("b",Tt,r(X(t)||"ที่อยู่นี้"),1)])]),s("button",{class:"banner-switch-btn",type:"button",onClick:z(a=>D.value=t,["stop"])},[...e[44]||(e[44]=[s("i",{class:"fa-solid fa-arrow-right-arrow-left"},null,-1),g(" สลับ/เลือกที่อยู่ ",-1)])],8,Dt)],8,Bt)):y("",!0),I.value==="landscape"?(p(),m("div",Pt,[s("div",Nt,[s("div",Et,[s("div",Ot,r(u.value.name||"มะนาวแซ่บ"),1),s("div",jt,r(u.value.address||"191 หมู่3 ต.ขามใหญ่ อ.เมือง จ.อุบลราชธานี 34000"),1),s("div",Ft,"โทร. "+r(u.value.phone||"095-155-5706"),1)]),s("div",Ut,[s("div",{class:"ls-meta-text system-name",title:`ชื่อลูกค้าในระบบ: ${t.name}`},[s("span",null,r(de(t)),1),s("span",{class:"ls-contact-tag",onClick:z(a=>be(t),["stop"]),title:"คลิกเพื่อสลับช่องทางติดต่อ (Line / LineOA / โทร)"}," ("+r(ce(t))+") ",9,qt)],8,Mt),s("div",{class:"ls-meta-text payment-text",onClick:z(a=>re(t),["stop"]),title:"คลิกเพื่อสลับ โอน / COD"},r(Q(t)),9,Vt)])]),s("div",Wt,[s("div",Yt,r(H(t)),1),s("div",Rt,r(oe(t)||"⚠️ ยังไม่มีที่อยู่จัดส่ง (กรุณานำเข้าจาก Note หรือพิมพ์เพิ่ม)"),1),N(t)?(p(),m("div",Ht,[s("span",Kt,r(N(t)),1)])):y("",!0),s("div",Qt," โทร "+r(K(t)||"-"),1)])])):(p(),m("div",Zt,[s("div",Gt,[s("div",Jt,[s("div",Xt,r(u.value.name||"มะนาวแซ่บ"),1),s("div",en,r(u.value.address||"191 หมู่3 ต.ขามใหญ่ อ.เมือง จ.อุบลราชธานี 34000"),1),s("div",tn,"โทร. "+r(u.value.phone||"095-155-5706"),1)])]),s("div",nn,[s("div",sn,[s("div",ln,r(H(t)),1),s("div",an,r(oe(t)||"⚠️ ยังไม่มีที่อยู่จัดส่ง (กรุณานำเข้าจาก Note หรือพิมพ์เพิ่ม)"),1),N(t)?(p(),m("div",on,[s("span",dn,r(N(t)),1)])):y("",!0),s("div",rn," โทร "+r(K(t)||"-"),1)])]),s("div",cn,[s("div",{class:"ls-meta-text system-name",title:`ชื่อลูกค้าในระบบ: ${t.name}`},[s("span",null,r(de(t)),1),s("span",{class:"ls-contact-tag",onClick:z(a=>be(t),["stop"]),title:"คลิกเพื่อสลับช่องทางติดต่อ (Line / LineOA / โทร)"}," ("+r(ce(t))+") ",9,un)],8,pn),s("div",{class:"ls-meta-text payment-text",onClick:z(a=>re(t),["stop"]),title:"คลิกเพื่อสลับ โอน / COD"},r(Q(t)),9,mn)])])),s("div",vn,r(u.value.thankYouText||"🙏 ขอบคุณที่อุดหนุนนะคะ ❤️"),1)],2))),128))],2)]),me.value?(p(),Me(Ve,{key:0,customer:me.value,addressBook:ue.addressBook,onClose:e[20]||(e[20]=t=>D.value=null)},null,8,["customer","addressBook"])):y("",!0)]))}},Cn=We(fn,[["__scopeId","data-v-3cd18a66"]]);export{Cn as default};
