import React from 'react';

const NewCountry = (props) => {
    const {onAdd} = props;
    const togglePrompt = () => {
        //triggers prompt box
        const name = prompt('Enter country name');
        if (name && name.trim().length > 0) {
            onAdd(name);
        }
    }


    return (
        <div className='newCountryButton'>
            <button onClick={togglePrompt}>Add Country</button>
        </div>
    );
}


export default NewCountry;
