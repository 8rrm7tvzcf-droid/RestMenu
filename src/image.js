const load=file=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=URL.createObjectURL(file)});
const canvasBlob=canvas=>new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.94));
/** Local, conservative preprocessing. The original File is never changed. */
export async function preprocessImage(file){
 const img=await load(file),max=2400,scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
 const c=document.createElement('canvas');c.width=Math.round(img.naturalWidth*scale);c.height=Math.round(img.naturalHeight*scale);const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(img,0,0,c.width,c.height);
 let im=x.getImageData(0,0,c.width,c.height),d=im.data,hist=new Uint32Array(256);for(let i=0;i<d.length;i+=4)hist[Math.round(.299*d[i]+.587*d[i+1]+.114*d[i+2])]++;
 const total=c.width*c.height;let low=0,high=255,sum=0;while(low<255&&(sum+=hist[low])<total*.015)low++;sum=0;while(high>0&&(sum+=hist[high])<total*.015)high--;const range=Math.max(40,high-low);
 const gray=new Uint8ClampedArray(total);for(let p=0,i=0;i<d.length;i+=4,p++){let g=Math.round(.299*d[i]+.587*d[i+1]+.114*d[i+2]);g=Math.max(0,Math.min(255,(g-low)*255/range));gray[p]=g}
 for(let y=1;y<c.height-1;y++)for(let z=1;z<c.width-1;z++){const p=y*c.width+z;let s=0;for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++)s+=gray[p+yy*c.width+xx];const blur=s/9,g=Math.max(0,Math.min(255,gray[p]*1.55-blur*.55));const i=p*4;d[i]=d[i+1]=d[i+2]=g;d[i+3]=255}x.putImageData(im,0,0);
 const edge=16,ink=v=>v<235;let left=0,right=c.width-1,top=0,bottom=c.height-1;const col=q=>{let n=0;for(let y=0;y<c.height;y+=4)n+=ink(gray[y*c.width+q]);return n};const row=q=>{let n=0;for(let z=0;z<c.width;z+=4)n+=ink(gray[q*c.width+z]);return n};while(left<c.width*.12&&col(left)<edge)left++;while(right>c.width*.88&&col(right)<edge)right--;while(top<c.height*.12&&row(top)<edge)top++;while(bottom>c.height*.88&&row(bottom)<edge)bottom--;
 if(right-left>c.width*.72&&bottom-top>c.height*.72&&(left||top||right<c.width-1||bottom<c.height-1)){const out=document.createElement('canvas');out.width=right-left+1;out.height=bottom-top+1;out.getContext('2d').drawImage(c,left,top,out.width,out.height,0,0,out.width,out.height);return canvasBlob(out)}return canvasBlob(c)
}
