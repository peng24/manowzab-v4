import{r as z,p as Te,a as Re,c as x,o as We,f as v,e as u,h as s,d as Ye,g as b,t as r,k,w as U,v as G,i as y,F as J,j as De,l as L,D as Pe}from"./vendor-vue-CjV_GP4_.js";import{u as oe,r as de}from"./vendor-firebase-BGywcYca.js";import{ab as He,d as re,ah as S}from"./swalConfig-DPV_sW7G.js";import{n as W,c as Ke}from"./addressParser-CjuCEY8I.js";import Qe from"./CustomerAddressModal-COC1CnC5.js";import{S as T}from"./vendor-sweetalert-DE6NlnlT.js";const Ze={class:"slm-modal"},Ge={class:"slm-header no-print"},Je={class:"slm-title"},Xe={class:"slm-count-badge"},et={class:"slm-controls no-print"},tt={class:"slm-filter-group"},nt={class:"slm-customer-selector"},st={class:"slm-selector-header"},it={class:"slm-search-box"},lt={class:"slm-quick-select-btns"},at={class:"slm-chips-scroll"},ot=["onClick","title"],dt={class:"chip-checkbox"},rt={class:"chip-name"},ct={key:0,class:"chip-items"},pt=["onClick","title"],ut={key:0,class:"chip-active-lbl"},mt=["onClick","title"],vt=["onClick","title"],ft={key:2,class:"chip-warn-tag",title:"ยังไม่มีที่อยู่"},ht={key:0,class:"slm-no-chips"},gt={class:"slm-options-row"},yt={class:"slm-select-wrap"},bt={class:"slm-orient-tabs"},kt={class:"slm-select-wrap"},wt={class:"slm-select-wrap"},Ct={style:{display:"flex",gap:"8px","flex-wrap":"wrap"}},$t={key:0,class:"slm-sender-box"},_t={class:"slm-sender-grid"},xt={class:"slm-select-bar"},St={style:{display:"flex","align-items":"center",gap:"12px","flex-wrap":"wrap"}},At={class:"slm-check-all"},zt=["checked"],Lt={key:0,class:"slm-addr-counter"},It={class:"cnt-item has"},Bt={key:0,class:"cnt-item missing"},Tt={style:{display:"flex",gap:"8px"}},Dt=["disabled"],Pt={key:0,class:"slm-empty-state no-print"},Nt=["onClick"],Et={class:"banner-text"},Ot={class:"highlight-label"},Ut=["onClick"],jt={key:1,class:"label-main-grid"},Ft={class:"ls-sender-col"},Mt={class:"ls-sender-info"},qt={class:"ls-sender-name"},Vt={class:"ls-sender-addr",style:{"white-space":"pre-line"}},Rt={class:"ls-sender-phone"},Wt={class:"ls-bottom-left"},Yt=["title"],Ht=["onClick"],Kt=["onClick"],Qt={class:"ls-receiver-col"},Zt={class:"ls-receiver-name"},Gt={class:"ls-receiver-addr"},Jt={key:0,class:"ls-receiver-zip"},Xt={class:"zip-big"},en={class:"ls-receiver-phone"},tn={key:2,class:"label-portrait-body"},nn={class:"label-sender-block"},sn={class:"sender-body"},ln={class:"sender-name-line"},an={class:"sender-addr-line",style:{"white-space":"pre-line"}},on={class:"sender-phone-line"},dn={class:"label-receiver-block"},rn={class:"receiver-body"},cn={class:"receiver-name"},pn={class:"receiver-address"},un={key:0,class:"receiver-zipcode"},mn={class:"zip-num"},vn={class:"receiver-phone"},fn={class:"portrait-meta-bottom"},hn=["title"],gn=["onClick"],yn=["onClick"],bn={class:"label-thankyou-footer"},kn={__name:"ShippingLabelModal",props:{customers:{type:Array,default:()=>[]},addressBook:{type:Object,default:()=>({})},initialSelectedId:{type:String,default:null}},emits:["close"],setup(he){let D=null;const c=he,C=z("unprinted"),I=z("landscape"),j=z("thermal-76x130"),F=z(localStorage.getItem("manowzab_label_font_scale")||"preview"),X=z(!1),g=z([]),B=z(""),P=z(null);function Ne(){localStorage.setItem("manowzab_label_font_scale",F.value)}const ge=x(()=>P.value?c.customers.find(t=>t.id===P.value.id)||P.value:null),m=z({name:localStorage.getItem("manowzab_sender_name")||"มะนาวแซ่บ",phone:localStorage.getItem("manowzab_sender_phone")||"095-155-5706",address:localStorage.getItem("manowzab_sender_address")||"191 หมู่3 ต.ขามใหญ่ อ.เมือง จ.อุบลราชธานี 34000",thankYouText:localStorage.getItem("manowzab_sender_thankyou")||"🙏 ขอบคุณที่อุดหนุนนะคะ ❤️"});Te(m,t=>{localStorage.setItem("manowzab_sender_name",t.name||""),localStorage.setItem("manowzab_sender_phone",t.phone||""),localStorage.setItem("manowzab_sender_address",t.address||""),localStorage.setItem("manowzab_sender_thankyou",t.thankYouText||"")},{deep:!0});function M(t){if(!t)return 1/0;const e=new Date;e.setHours(0,0,0,0);const n=new Date(t);return n.setHours(0,0,0,0),Math.ceil((n-e)/(1e3*60*60*24))}const A=x(()=>[...c.customers.filter(e=>c.initialSelectedId&&e.id===c.initialSelectedId?!0:e&&e.status!=="done"&&e.deliveryDate&&typeof e.deliveryDate=="string"&&e.deliveryDate.trim()!=="")].sort((e,n)=>{const l=M(e.deliveryDate),a=M(n.deliveryDate);return l!==a?l-a:(e.deliveryDate||"").localeCompare(n.deliveryDate||"")})),Ee=x(()=>A.value.filter(t=>!t.labelPrinted).length),ye=x(()=>A.value.filter(t=>M(t.deliveryDate)===0).length),be=x(()=>A.value.filter(t=>M(t.deliveryDate)===1).length),Oe=x(()=>A.value.length),$=x(()=>{let t=A.value;if(C.value==="unprinted"?t=A.value.filter(e=>!e.labelPrinted):C.value==="today"?t=A.value.filter(e=>M(e.deliveryDate)===0):C.value==="pack-tonight"&&(t=A.value.filter(e=>M(e.deliveryDate)===1)),c.initialSelectedId){const e=A.value.find(n=>n.id===c.initialSelectedId);e&&!t.some(n=>n.id===c.initialSelectedId)&&(t=[e,...t])}if(B.value.trim()){const e=B.value.trim().toLowerCase();t=t.filter(n=>{const l=(n.name||"").toLowerCase(),a=(n.recipientName||"").toLowerCase(),i=(V(n)||"").toLowerCase();return l.includes(e)||a.includes(e)||i.includes(e)})}return t}),w=x(()=>$.value.filter(t=>g.value.includes(t.id))),ke=x(()=>w.value.filter(t=>!!V(t)).length),we=x(()=>w.value.length-ke.value),Ue=x(()=>$.value.length>0&&g.value.length===$.value.length);Te(()=>c.initialSelectedId,t=>{t?(C.value="all-requested",g.value=[t],B.value=""):(C.value="all-requested",g.value=$.value.map(e=>e.id))},{immediate:!0}),Re(()=>{c.initialSelectedId?(C.value="all-requested",g.value=[c.initialSelectedId],B.value=""):ye.value>0?N("today"):be.value>0?N("pack-tonight"):N("all-requested")});function N(t){C.value=t,g.value=$.value.map(e=>e.id)}function je(t){t?g.value=$.value.map(e=>e.id):g.value=[]}function Fe(t){const e=g.value.indexOf(t);e>-1?g.value.splice(e,1):g.value.push(t)}async function Me(t){const e=!t.labelPrinted;try{await oe(de(re,`delivery_customers/${t.id}`),{labelPrinted:e,labelPrintedAt:e?Date.now():null}),T.fire({icon:"success",title:e?`ทำเครื่องหมาย "${t.name}" พิมพ์แล้ว`:`ยกเลิกสถานะพิมพ์แล้วของ "${t.name}"`,toast:!0,position:"top-end",timer:1500,showConfirmButton:!1})}catch(n){console.error("Error updating printed status:",n)}}function q(t){if(!t)return[];const e=W(t.name).replace(/[.#$[\]/]/g,"_"),n=t.addresses,l=c.addressBook&&c.addressBook[e]?.addresses,a=n||l;let i=[];if(Array.isArray(a)?i=a.filter(Boolean):a&&typeof a=="object"&&(i=Object.values(a).filter(Boolean)),i.length>0)return i;if(t.address&&t.address.trim()){const d=H(t);return d&&d.address?[d]:[]}return[]}function Y(t){return q(t).length}function ee(t){if(!t)return"";const e=q(t);if(!e||e.length===0)return"";if(t.selectedAddressId){const n=e.find(l=>l.id===t.selectedAddressId);if(n)return n.label||(n.recipientName?`${n.recipientName}`:"")}if(t.address&&t.address.trim()){const n=t.address.trim(),l=e.find(a=>a.address&&a.address.trim()===n);if(l)return l.label||(l.recipientName?`${l.recipientName}`:"")}return e[0]?.label||""}function H(t){if(t.address)return{recipientName:t.recipientName||"",phone:t.phone||"",address:t.address||"",postalCode:t.postalCode||""};const e=W(t.name).replace(/[.#$[\]/]/g,"_");return c.addressBook&&c.addressBook[e]?c.addressBook[e]:{recipientName:"",phone:"",address:"",postalCode:""}}function K(t){if(t.recipientName&&t.recipientName.trim())return t.recipientName.trim();const e=H(t);return e&&e.recipientName&&e.recipientName.trim()?e.recipientName.trim():t.name}function Q(t){return H(t).phone}function V(t){return H(t).address}function E(t){const e=H(t);if(e.postalCode)return e.postalCode;const n=(e.address||"").match(/\b[1-9]\d{4}\b(?!\/|\d)/);return n?n[0]:""}function ce(t){return Ke({rawAddress:V(t)||"",recipientName:K(t),phone:Q(t),postalCode:E(t)})}function pe(t,e=15){const n=(t?.name||"-").trim();return n.length<=e?n:n.slice(0,e).trim()+"…"}function R(t){if(!t)return"";if(t.paymentType){const o=String(t.paymentType).trim().toLowerCase();if(o==="cod"||o==="ปลายทาง"||o==="เก็บเงินปลายทาง"||o==="เก็บปลายทาง")return"cod";if(o==="transfer"||o==="โอน"||o==="โอนเงิน")return"transfer"}const e=W(t.name).replace(/[.#$[\]/]/g,"_"),n=c.addressBook&&e?c.addressBook[e]:null;if(n&&n.paymentType){const o=String(n.paymentType).trim().toLowerCase();if(o==="cod"||o==="ปลายทาง"||o==="เก็บเงินปลายทาง"||o==="เก็บปลายทาง")return"cod";if(o==="transfer"||o==="โอน"||o==="โอนเงิน")return"transfer"}const l=q(t),a=t.selectedAddressId?l.find(o=>o.id===t.selectedAddressId):l[0];if(a&&a.paymentType){const o=String(a.paymentType).trim().toLowerCase();if(o==="cod"||o==="ปลายทาง"||o==="เก็บเงินปลายทาง"||o==="เก็บปลายทาง")return"cod";if(o==="transfer"||o==="โอน"||o==="โอนเงิน")return"transfer"}const i=(t.note||"").toLowerCase(),d=(t.address||"").toLowerCase();return i.includes("cod")||i.includes("ปลายทาง")||i.includes("เก็บเงิน")||d.includes("cod")||d.includes("ปลายทาง")?"cod":""}function Z(t){const e=R(t);if(e==="cod"){const n=(t?.note||"").match(/(?:cod|ปลายทาง)\s*[:=]?\s*(\d+)/i);return n&&n[1]?`COD (${n[1]}฿)`:"COD"}return e==="transfer"?"โอน":"ยังไม่ระบุ"}async function ue(t){if(!t)return;const e=R(t),n=e==="cod"?"transfer":e==="transfer"?"cod":"transfer";t.paymentType=n;const l=Date.now(),a=W(t.name).replace(/[.#$[\]/]/g,"_"),i={[`delivery_customers/${t.id}/paymentType`]:n,[`delivery_customers/${t.id}/updatedAt`]:l};a&&(i[`address_book/${a}/paymentType`]=n,i[`address_book/${a}/name`]=t.name.trim(),i[`address_book/${a}/updatedAt`]=l,c.addressBook&&c.addressBook[a]&&(c.addressBook[a].paymentType=n));const d=q(t);if(d.length>0){const o=d.map(p=>({...p,paymentType:t.selectedAddressId&&p.id===t.selectedAddressId||d.length===1?n:p.paymentType||n}));i[`delivery_customers/${t.id}/addresses`]=o,a&&(i[`address_book/${a}/addresses`]=o)}try{await oe(de(re),i),T.fire({icon:"success",title:`บันทึกรูปแบบ "${t.name}" เป็น "${n==="cod"?"COD":"โอน"}" ไว้ในประวัติลูกค้าแล้ว`,toast:!0,position:"top-end",timer:1500,showConfirmButton:!1})}catch(o){console.error("Error toggling paymentType:",o)}}function Ce(t){if(!t)return"";if(t.contactChannel){const i=String(t.contactChannel).trim().toLowerCase();if(i==="lineoa"||i==="line_oa"||i==="line-oa")return"lineoa";if(i==="phone"||i==="tel"||i==="โทร"||i==="โทรศัพท์")return"phone";if(i==="line")return"line"}const e=W(t.name).replace(/[.#$[\]/]/g,"_"),n=c.addressBook&&e?c.addressBook[e]:null;if(n&&n.contactChannel){const i=String(n.contactChannel).trim().toLowerCase();if(i==="lineoa"||i==="line_oa"||i==="line-oa")return"lineoa";if(i==="phone"||i==="tel"||i==="โทร"||i==="โทรศัพท์")return"phone";if(i==="line")return"line"}const l=q(t),a=t.selectedAddressId?l.find(i=>i.id===t.selectedAddressId):l[0];if(a&&a.contactChannel){const i=String(a.contactChannel).trim().toLowerCase();if(i==="lineoa"||i==="line_oa"||i==="line-oa")return"lineoa";if(i==="phone"||i==="tel"||i==="โทร"||i==="โทรศัพท์")return"phone";if(i==="line")return"line"}return""}function me(t){const e=Ce(t);return e==="lineoa"?"LineOA":e==="phone"?"โทร":e==="line"?"Line":"-"}async function $e(t){if(!t)return;const e=Ce(t),n=e==="line"?"lineoa":e==="lineoa"?"phone":"line";t.contactChannel=n;const l=Date.now(),a=W(t.name).replace(/[.#$[\]/]/g,"_"),i={[`delivery_customers/${t.id}/contactChannel`]:n,[`delivery_customers/${t.id}/updatedAt`]:l};a&&(i[`address_book/${a}/contactChannel`]=n,i[`address_book/${a}/name`]=t.name.trim(),i[`address_book/${a}/updatedAt`]=l,c.addressBook&&c.addressBook[a]&&(c.addressBook[a].contactChannel=n));const d=q(t);if(d.length>0){const o=d.map(p=>({...p,contactChannel:t.selectedAddressId&&p.id===t.selectedAddressId||d.length===1?n:p.contactChannel||n}));i[`delivery_customers/${t.id}/addresses`]=o,a&&(i[`address_book/${a}/addresses`]=o)}try{await oe(de(re),i);const o=n==="lineoa"?"LineOA":n==="phone"?"โทรศัพท์":"Line";T.fire({icon:"success",title:`บันทึกช่องทางติดต่อ "${t.name}" เป็น "${o}" เรียบร้อย`,toast:!0,position:"top-end",timer:1500,showConfirmButton:!1})}catch(o){console.error("Error toggling contactChannel:",o)}}function qe(){if(w.value.length===0)return;const t=document.getElementById("manowzab-label-print-frame");t&&t.remove();const e=I.value==="landscape";let n=76,l=130;j.value==="thermal-100x150"?(n=100,l=150):j.value==="thermal-80x100"&&(n=80,l=100);const a=e?`${l}mm`:`${n}mm`,i=e?`${n}mm`:`${l}mm`,d=document.createElement("iframe");d.id="manowzab-label-print-frame",d.style.position="fixed",d.style.left="-9999px",d.style.top="0",d.style.width=a,d.style.height=i,d.style.border="0",d.style.visibility="hidden",d.style.pointerEvents="none",d.style.zIndex="-9999",document.body.appendChild(d);const o=S(m.value.name||"มะนาวแซ่บ"),p=S(m.value.phone||"095-155-5706"),ne=S(m.value.address||"191 หมู่3 ต.ขามใหญ่ อ.เมือง จ.อุบลราชธานี 34000").replace(/\n/g,"<br>"),se=S(m.value.thankYouText||"🙏 ขอบคุณที่อุดหนุนนะคะ ❤️"),ve=F.value==="compact"?.9:F.value==="large"?1.2:1,h=f=>`${(f*ve).toFixed(1)}pt`,ie=[...w.value],fe=ie.map(f=>{const _=K(f),O=ce(f)||"⚠️ ยังไม่มีที่อยู่จัดส่ง",_e=S(_),xe=S(O),ae=S(E(f)),Se=S(Q(f)||"-"),Ae=S(Z(f)),ze=S(pe(f)),Le=S(me(f)),Ie=_.length>26?"name-long":"",Be=O.length>130?"addr-xlong":O.length>85?"addr-long":"";return e?`
          <div class="print-page">
            <div class="print-card landscape">
              <div class="card-grid">
                <!-- Left: Sender + Bottom-Left System Info -->
                <div class="ls-sender">
                  <div class="sender-top-info">
                    <div class="sender-name">${o}</div>
                    <div class="sender-addr">${ne}</div>
                    <div class="sender-phone">โทร. ${p}</div>
                  </div>

                  <!-- 📌 Bottom-Left Meta on Printed Label (Plain Text) -->
                  <div class="ls-meta-bottom">
                    <div class="meta-system-name">${ze} (${Le})</div>
                    <div class="meta-payment-row">${Ae}</div>
                  </div>
                </div>

                <!-- Right: Receiver -->
                <div class="ls-receiver">
                  <div class="receiver-name ${Ie}">${_e}</div>
                  <div class="receiver-addr ${Be}">${xe}</div>
                  ${ae?`<div class="receiver-zip">${ae}</div>`:""}
                  <div class="receiver-phone">โทร ${Se}</div>
                </div>
              </div>

              <!-- Thank you footer -->
              <div class="card-footer">${se}</div>
            </div>
          </div>
        `:`
          <div class="print-page">
            <div class="print-card portrait">
              <div class="port-sender">
                <div class="sender-name">${o}</div>
                <div class="sender-addr">${ne}</div>
                <div class="sender-phone">โทร. ${p}</div>
              </div>

              <div class="port-receiver">
                <div class="receiver-name ${Ie}">${_e}</div>
                <div class="receiver-addr ${Be}">${xe}</div>
                ${ae?`<div class="receiver-zip">${ae}</div>`:""}
                <div class="receiver-phone">โทร ${Se}</div>
              </div>

              <!-- Portrait Bottom-Left Meta (Plain Text) -->
              <div class="port-meta-bottom">
                <div class="meta-system-name">${ze} (${Le})</div>
                <div class="meta-payment-row">${Ae}</div>
              </div>

              <div class="card-footer">${se}</div>
            </div>
          </div>
        `}).join(""),le=d.contentWindow.document;le.open(),le.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>พิมพ์ใบปะหน้าพัสดุ - ${o}</title>
        <link id="label-font-link" href="https://fonts.googleapis.com/css2?family=Kanit:wght@400;500;600;700&family=Sarabun:wght@500;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page {
            size: ${a} ${i};
            margin: 0mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          html, body {
            width: ${a};
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
            width: ${a};
            height: ${i};
            max-width: ${a};
            max-height: ${i};
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
        ${fe}
      </body>
    </html>
  `),le.close(),D&&clearTimeout(D),D=setTimeout(async()=>{try{if(te||!d.isConnected||!d.contentWindow)return;const f=le.getElementById("label-font-link");if(f&&!f.sheet&&await Promise.race([new Promise(_=>{f.addEventListener("load",_,{once:!0}),f.addEventListener("error",_,{once:!0})}),new Promise(_=>setTimeout(_,800))]),te||!d.isConnected||!d.contentWindow)return;d.contentWindow.document?.fonts&&await Promise.race([d.contentWindow.document.fonts.ready,new Promise(_=>setTimeout(_,800))])}catch{}if(!(te||!d.isConnected||!d.contentWindow)){d.contentWindow.focus(),d.contentWindow.print();try{const f={},_=Date.now();ie.forEach(O=>{O?.id&&(f[`delivery_customers/${O.id}/labelPrinted`]=!0,f[`delivery_customers/${O.id}/labelPrintedAt`]=_)}),Object.keys(f).length>0&&await oe(de(re),f)}catch(f){console.error("Error auto-updating labelPrinted status:",f)}D=null}},150)}let te=!1;We(()=>{te=!0,D&&(clearTimeout(D),D=null);const t=document.getElementById("manowzab-label-print-frame");t&&t.remove(),typeof T<"u"&&T.isVisible()&&T.close()});function Ve(){if(w.value.length===0){T.fire({icon:"warning",title:"ไม่มีรายการที่เลือก",text:"กรุณาเลือกรายการลูกค้าที่ต้องการส่งออกก่อนครับ"});return}const t=p=>`"${String(p??"").replace(/"/g,'""')}"`,e=[["ลำดับ","ชื่อผู้รับ (พิมพ์บนกล่อง)","ชื่อในระบบ (CF)","รูปแบบการส่ง","เบอร์โทร","ที่อยู่","รหัสไปรษณีย์","จำนวนสินค้า","รอบส่ง","โน้ต","ผู้ส่ง","เบอร์ผู้ส่ง","ที่อยู่ผู้ส่ง"]];w.value.forEach((p,ne)=>{const se=K(p)||"",ve=Q(p)||"",h=V(p)||"",ie=E(p)||"",fe=Z(p);e.push([ne+1,t(se),t(p.name||""),t(fe),t(ve),t(h),t(ie),p.itemCount||0,t(p.deliveryDate||""),t(p.note||""),t(m.value.name||""),t(m.value.phone||""),t(m.value.address||"")])});const n="\uFEFF"+e.map(p=>p.join(",")).join(`
`),l=new Blob([n],{type:"text/csv;charset=utf-8;"}),a=URL.createObjectURL(l),i=document.createElement("a"),d=new Date,o=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;i.setAttribute("href",a),i.setAttribute("download",`รายการที่อยู่จัดส่ง_130x76_${o}.csv`),document.body.appendChild(i),i.click(),document.body.removeChild(i),setTimeout(()=>URL.revokeObjectURL(a),1e3),T.fire({icon:"success",title:"ส่งออกไฟล์สำเร็จ!",html:`
      <div style="text-align: left; font-size: 0.9em; line-height: 1.6;">
        ดาวน์โหลดไฟล์ <b>.csv</b> เรียบร้อยแล้ว<br>
        สามารถนำไฟล์นี้ไปกดเปิดในแอปเครื่องพิมพ์ (ปุ่ม <b>Excel</b>) เพื่อพิมพ์สติ๊กเกอร์รวดเดียวได้เลยครับ!
      </div>
    `,confirmButtonColor:"#3b82f6"})}return(t,e)=>(u(),v("div",{class:"slm-overlay",onClick:e[21]||(e[21]=L(n=>t.$emit("close"),["self"]))},[s("div",Ze,[s("div",Ge,[s("div",Je,[e[22]||(e[22]=s("span",null,"🏷️ ใบปะหน้าพัสดุ 130x76 mm (แนวนอน)",-1)),s("span",Xe,r(w.value.length)+" รายการ",1)]),s("button",{class:"slm-close-btn",onClick:e[0]||(e[0]=n=>t.$emit("close")),title:"ปิด"},[...e[23]||(e[23]=[s("i",{class:"fa-solid fa-xmark"},null,-1)])])]),s("div",et,[s("div",tt,[s("button",{class:k(["slm-filter-btn",{active:C.value==="unprinted"}]),onClick:e[1]||(e[1]=n=>N("unprinted"))}," ⏳ ยังไม่พิมพ์ ("+r(Ee.value)+") ",3),s("button",{class:k(["slm-filter-btn",{active:C.value==="today"}]),onClick:e[2]||(e[2]=n=>N("today"))}," 🚨 ส่งวันนี้ ("+r(ye.value)+") ",3),s("button",{class:k(["slm-filter-btn",{active:C.value==="pack-tonight"}]),onClick:e[3]||(e[3]=n=>N("pack-tonight"))}," 📦 แพ็คคืนนี้ ("+r(be.value)+") ",3),s("button",{class:k(["slm-filter-btn",{active:C.value==="all-requested"}]),onClick:e[4]||(e[4]=n=>N("all-requested"))}," 🌐 ทั้งหมดที่รอส่ง ("+r(Oe.value)+") ",3)]),s("div",nt,[s("div",st,[s("div",it,[e[24]||(e[24]=s("i",{class:"fa-solid fa-magnifying-glass slm-search-icon"},null,-1)),U(s("input",{type:"text","onUpdate:modelValue":e[5]||(e[5]=n=>B.value=n),class:"slm-search-input",placeholder:"🔍 ค้นหาชื่อลูกค้า / ผู้รับ (เช่น หนิง, ปิยะวาท)..."},null,512),[[G,B.value]]),B.value?(u(),v("button",{key:0,class:"slm-clear-search",onClick:e[6]||(e[6]=n=>B.value="")},"✕")):b("",!0)]),s("div",lt,[s("button",{class:"slm-mini-btn",onClick:e[7]||(e[7]=n=>g.value=$.value.map(l=>l.id))},[...e[25]||(e[25]=[s("i",{class:"fa-solid fa-check-double"},null,-1),y(" เลือกทั้งหมด ",-1)])]),s("button",{class:"slm-mini-btn",onClick:e[8]||(e[8]=n=>g.value=[])},[...e[26]||(e[26]=[s("i",{class:"fa-solid fa-xmark"},null,-1),y(" ยกเลิกทั้งหมด ",-1)])]),s("button",{class:"slm-mini-btn highlight",onClick:e[9]||(e[9]=n=>g.value=$.value.filter(l=>!l.labelPrinted).map(l=>l.id))},[...e[27]||(e[27]=[s("i",{class:"fa-solid fa-filter"},null,-1),y(" เฉพาะที่ยังไม่พิมพ์ ",-1)])])])]),s("div",at,[(u(!0),v(J,null,De($.value,n=>(u(),v("div",{key:n.id,class:k(["slm-cust-chip",{selected:g.value.includes(n.id),printed:n.labelPrinted,"no-address":!V(n)}]),onClick:l=>Fe(n.id),title:`คลิกเพื่อ ${g.value.includes(n.id)?"ยกเลิก":"เลือก"} ${n.name}`},[s("span",dt,[s("i",{class:k(["fa-solid",g.value.includes(n.id)?"fa-square-check":"fa-square"])},null,2)]),s("span",rt,r(n.name),1),n.itemCount?(u(),v("span",ct,"("+r(n.itemCount)+" ชิ้น)",1)):b("",!0),Y(n)>1?(u(),v("span",{key:1,class:"chip-multi-addr-tag",onClick:L(l=>P.value=n,["stop"]),title:`ลูกค้ารายนี้มี ${Y(n)} ที่อยู่ (เลือก: ${ee(n)||"ที่อยู่นี้"}) — คลิกเพื่อเปลี่ยนที่อยู่จัดส่ง`},[e[28]||(e[28]=s("i",{class:"fa-solid fa-layer-group"},null,-1)),s("span",null,r(Y(n))+" ที่อยู่",1),ee(n)?(u(),v("span",ut,": "+r(ee(n)),1)):b("",!0)],8,pt)):b("",!0),s("span",{class:k(["chip-payment-tag",R(n)==="cod"?"is-cod":R(n)==="transfer"?"is-transfer":"is-unspecified"]),onClick:L(l=>ue(n),["stop"]),title:`รูปแบบจัดส่ง: ${Z(n)} (คลิกเพื่อสลับระหว่าง โอน / COD)`},[R(n)==="cod"?(u(),v(J,{key:0},[y("💵 COD")],64)):R(n)==="transfer"?(u(),v(J,{key:1},[y("💳 โอน")],64)):(u(),v(J,{key:2},[y("❓ ยังไม่ระบุ")],64))],10,mt),s("span",{class:k(["chip-status-tag",n.labelPrinted?"is-printed":"is-unprinted"]),onClick:L(l=>Me(n),["stop"]),title:n.labelPrinted?"พิมพ์แล้ว (คลิกเพื่อเปลี่ยนเป็นยังไม่พิมพ์)":"ยังไม่พิมพ์ (คลิกเพื่อเปลี่ยนเป็นพิมพ์แล้ว)"},[s("i",{class:k(n.labelPrinted?"fa-solid fa-circle-check":"fa-solid fa-print")},null,2),y(" "+r(n.labelPrinted?"พิมพ์แล้ว":"ยังไม่พิมพ์"),1)],10,vt),V(n)?b("",!0):(u(),v("span",ft," ⚠️ รอที่อยู่ "))],10,ot))),128)),$.value.length===0?(u(),v("div",ht," ไม่พบรายชื่อในหมวดนี้ ")):b("",!0)])]),s("div",gt,[s("div",yt,[e[29]||(e[29]=s("label",null,[s("i",{class:"fa-solid fa-rotate"}),y(" ทิศทาง:")],-1)),s("div",bt,[s("button",{class:k(["slm-orient-btn",{active:I.value==="landscape"}]),onClick:e[10]||(e[10]=n=>I.value="landscape")}," 🔄 แนวนอน (130x76mm) ",2),s("button",{class:k(["slm-orient-btn",{active:I.value==="portrait"}]),onClick:e[11]||(e[11]=n=>I.value="portrait")}," ↕️ แนวตั้ง (76x130mm) ",2)])]),s("div",kt,[e[31]||(e[31]=s("label",null,[s("i",{class:"fa-solid fa-scroll"}),y(" ขนาดฉลาก:")],-1)),U(s("select",{"onUpdate:modelValue":e[12]||(e[12]=n=>j.value=n),class:"slm-select"},[...e[30]||(e[30]=[s("option",{value:"thermal-76x130"},"สติ๊กเกอร์ 76 x 130 mm (มาตรฐานของคุณ)",-1),s("option",{value:"thermal-100x150"},'สติ๊กเกอร์ 100 x 150 mm (4x6")',-1),s("option",{value:"thermal-80x100"},"สติ๊กเกอร์ 80 x 100 mm",-1),s("option",{value:"a4-grid"},"กระดาษ A4 (สติ๊กเกอร์ 2 คอลัมน์)",-1)])],512),[[Pe,j.value]])]),s("div",wt,[e[33]||(e[33]=s("label",null,[s("i",{class:"fa-solid fa-text-height"}),y(" ขนาดตัวหนังสือ:")],-1)),U(s("select",{"onUpdate:modelValue":e[13]||(e[13]=n=>F.value=n),class:"slm-select",onChange:Ne},[...e[32]||(e[32]=[s("option",{value:"preview"},"พอดีตามพรีวิว (แนะนำ)",-1),s("option",{value:"compact"},"กะทัดรัด (ย่อ -10%)",-1),s("option",{value:"large"},"ตัวใหญ่ (+20%)",-1)])],544),[[Pe,F.value]])]),s("div",Ct,[s("button",{class:"slm-export-excel-btn",onClick:Ve,title:"ส่งออกไฟล์เพื่อนำเข้าไปเปิดในแอปเครื่องพิมพ์"},[...e[34]||(e[34]=[s("i",{class:"fa-solid fa-file-excel"},null,-1),y(" ส่งออก Excel เข้าแอปปริ้นเตอร์ ",-1)])]),s("button",{class:"slm-toggle-sender-btn",onClick:e[14]||(e[14]=n=>X.value=!X.value)},[e[35]||(e[35]=s("i",{class:"fa-solid fa-store"},null,-1)),y(" "+r(X.value?"ซ่อนข้อมูลร้าน":"แก้ไขข้อมูลร้านผู้ส่ง"),1)])])]),X.value?(u(),v("div",$t,[e[36]||(e[36]=s("div",{class:"slm-sender-title"},"🏠 ข้อมูลผู้ส่งและข้อความขอบคุณ (บันทึกจำไว้ในเครื่องอัตโนมัติ)",-1)),s("div",_t,[U(s("input",{type:"text","onUpdate:modelValue":e[15]||(e[15]=n=>m.value.name=n),class:"slm-input",placeholder:"ชื่อร้าน (เช่น มะนาวแซ่บ)"},null,512),[[G,m.value.name]]),U(s("input",{type:"text","onUpdate:modelValue":e[16]||(e[16]=n=>m.value.phone=n),class:"slm-input",placeholder:"เบอร์โทรผู้ส่ง"},null,512),[[G,m.value.phone]]),U(s("input",{type:"text","onUpdate:modelValue":e[17]||(e[17]=n=>m.value.address=n),class:"slm-input slm-col-span",placeholder:"ที่อยู่ผู้ส่ง (บ้านเลขที่ ตำบล อำเภอ จังหวัด รหัสไปรษณีย์)"},null,512),[[G,m.value.address]]),U(s("input",{type:"text","onUpdate:modelValue":e[18]||(e[18]=n=>m.value.thankYouText=n),class:"slm-input slm-col-span",placeholder:"ข้อความขอบคุณท้ายใบปะหน้า (เช่น 🙏 ขอบคุณที่อุดหนุนนะคะ ❤️)"},null,512),[[G,m.value.thankYouText]])])])):b("",!0),s("div",xt,[s("div",St,[s("label",At,[s("input",{type:"checkbox",checked:Ue.value,onChange:e[19]||(e[19]=n=>je(n.target.checked))},null,40,zt),s("span",null,"เลือก "+r(g.value.length)+" จาก "+r($.value.length)+" คน",1)]),w.value.length>0?(u(),v("span",Lt,[s("span",It,[e[37]||(e[37]=s("i",{class:"fa-solid fa-circle-check"},null,-1)),y(" มีที่อยู่ "+r(ke.value),1)]),we.value>0?(u(),v("span",Bt,[e[38]||(e[38]=s("i",{class:"fa-solid fa-circle-exclamation"},null,-1)),y(" รอที่อยู่ "+r(we.value),1)])):b("",!0)])):b("",!0)]),s("div",Tt,[s("button",{class:"btn btn-primary slm-print-btn",onClick:qe,disabled:w.value.length===0},[e[39]||(e[39]=s("i",{class:"fa-solid fa-print"},null,-1)),y(" สั่งพิมพ์ใบปะหน้า ("+r(w.value.length)+" ใบ) ",1)],8,Dt)])])]),s("div",{class:k(["slm-preview-area",["paper-"+j.value,"mode-"+I.value]])},[w.value.length===0?(u(),v("div",Pt,[...e[40]||(e[40]=[s("i",{class:"fa-solid fa-box-open slm-empty-icon"},null,-1),s("div",null,"ไม่มีรายการที่เลือกพิมพ์ (กรุณาคลิกเลือกรายชื่อลูกค้าด้านบน)",-1)])])):b("",!0),(u(!0),v(J,null,De(w.value,n=>(u(),v("div",{key:n.id,class:k(["shipping-label-card",["label-"+j.value,I.value==="landscape"?"layout-landscape":"layout-portrait","font-scale-"+F.value]])},[Y(n)>1?(u(),v("div",{key:0,class:"label-multi-addr-banner no-print",onClick:l=>P.value=n,title:"คลิกเพื่อสลับหรือเลือกที่อยู่จัดส่ง"},[s("div",Et,[e[43]||(e[43]=s("i",{class:"fa-solid fa-layer-group"},null,-1)),s("span",null,[e[41]||(e[41]=y("มี ",-1)),s("b",null,r(Y(n))+" ที่อยู่",1),e[42]||(e[42]=y(" • กำลังเลือกส่งที่: ",-1)),s("b",Ot,r(ee(n)||"ที่อยู่นี้"),1)])]),s("button",{class:"banner-switch-btn",type:"button",onClick:L(l=>P.value=n,["stop"])},[...e[44]||(e[44]=[s("i",{class:"fa-solid fa-arrow-right-arrow-left"},null,-1),y(" สลับ/เลือกที่อยู่ ",-1)])],8,Ut)],8,Nt)):b("",!0),I.value==="landscape"?(u(),v("div",jt,[s("div",Ft,[s("div",Mt,[s("div",qt,r(m.value.name||"มะนาวแซ่บ"),1),s("div",Vt,r(m.value.address||"191 หมู่3 ต.ขามใหญ่ อ.เมือง จ.อุบลราชธานี 34000"),1),s("div",Rt,"โทร. "+r(m.value.phone||"095-155-5706"),1)]),s("div",Wt,[s("div",{class:"ls-meta-text system-name",title:`ชื่อลูกค้าในระบบ: ${n.name}`},[s("span",null,r(pe(n)),1),s("span",{class:"ls-contact-tag",onClick:L(l=>$e(n),["stop"]),title:"คลิกเพื่อสลับช่องทางติดต่อ (Line / LineOA / โทร)"}," ("+r(me(n))+") ",9,Ht)],8,Yt),s("div",{class:"ls-meta-text payment-text",onClick:L(l=>ue(n),["stop"]),title:"คลิกเพื่อสลับ โอน / COD"},r(Z(n)),9,Kt)])]),s("div",Qt,[s("div",Zt,r(K(n)),1),s("div",Gt,r(ce(n)||"⚠️ ยังไม่มีที่อยู่จัดส่ง (กรุณานำเข้าจาก Note หรือพิมพ์เพิ่ม)"),1),E(n)?(u(),v("div",Jt,[s("span",Xt,r(E(n)),1)])):b("",!0),s("div",en," โทร "+r(Q(n)||"-"),1)])])):(u(),v("div",tn,[s("div",nn,[s("div",sn,[s("div",ln,r(m.value.name||"มะนาวแซ่บ"),1),s("div",an,r(m.value.address||"191 หมู่3 ต.ขามใหญ่ อ.เมือง จ.อุบลราชธานี 34000"),1),s("div",on,"โทร. "+r(m.value.phone||"095-155-5706"),1)])]),s("div",dn,[s("div",rn,[s("div",cn,r(K(n)),1),s("div",pn,r(ce(n)||"⚠️ ยังไม่มีที่อยู่จัดส่ง (กรุณานำเข้าจาก Note หรือพิมพ์เพิ่ม)"),1),E(n)?(u(),v("div",un,[s("span",mn,r(E(n)),1)])):b("",!0),s("div",vn," โทร "+r(Q(n)||"-"),1)])]),s("div",fn,[s("div",{class:"ls-meta-text system-name",title:`ชื่อลูกค้าในระบบ: ${n.name}`},[s("span",null,r(pe(n)),1),s("span",{class:"ls-contact-tag",onClick:L(l=>$e(n),["stop"]),title:"คลิกเพื่อสลับช่องทางติดต่อ (Line / LineOA / โทร)"}," ("+r(me(n))+") ",9,gn)],8,hn),s("div",{class:"ls-meta-text payment-text",onClick:L(l=>ue(n),["stop"]),title:"คลิกเพื่อสลับ โอน / COD"},r(Z(n)),9,yn)])])),s("div",bn,r(m.value.thankYouText||"🙏 ขอบคุณที่อุดหนุนนะคะ ❤️"),1)],2))),128))],2)]),ge.value?(u(),Ye(Qe,{key:0,customer:ge.value,addressBook:he.addressBook,onClose:e[20]||(e[20]=n=>P.value=null)},null,8,["customer","addressBook"])):b("",!0)]))}},An=He(kn,[["__scopeId","data-v-bc99fd5c"]]);export{An as default};
