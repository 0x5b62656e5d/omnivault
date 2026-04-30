/*
Loader animation by Nawsome
Source: https://uiverse.io/Nawsome/slimy-tiger-93
Modified (size, color)
Licensed under MIT (see NOTICE.md)
*/

import "@/components/loader.css";

export const Loader = () => {
    return (
        <div className="loadingspinner">
            <div id="square1" />
            <div id="square2" />
            <div id="square3" />
            <div id="square4" />
            <div id="square5" />
        </div>
    );
};
