import React from 'react';
import { Plus } from 'lucide-react';

const ProductCard = ({ product }) => {
  return (
    <div 
      className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 hover:shadow-md hover:border-primary/50 transition-all cursor-pointer group flex flex-col h-full active:scale-95"
    >
      {/* Gambar Produk - Aspect Square menjaga kotak tetap persegi */}
      <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-gray-100 w-full">
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          loading="lazy"
        />
        {/* Tombol Plus Overlay */}
        <div className="absolute bottom-2 right-2 bg-white text-primary p-2 rounded-full shadow-lg translate-y-10 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
          <Plus size={20} strokeWidth={3} />
        </div>
      </div>

      {/* Detail Produk */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-gray-800 text-sm leading-tight mb-1 line-clamp-2">
            {product.name}
          </h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">{product.category}</p>
        </div>
        <div className="font-black text-primary text-base">
          Rp {product.price.toLocaleString('id-ID')}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;