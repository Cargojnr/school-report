document.querySelector('form').addEventListener('submit', function(event){
    event.preventDefault();

    const formData = new FormData(event.target);
    const subjects = []

    for(let i = 0; i < formData.getAll('subjects[0].subject_id').length; i++){
       subjects.push({
        subject_id: formData.getAll('subjects['+ i + '].subject_id')[0],
        classScore: formData.getAll('subjects['+ i + '].classScore')[0],
        examsScore: formData.getAll('subjects['+ i + '].examsScore')[0],
        position: formData.getAll('subjects['+ i + '].position')[0],
        grade: formData.getAll('subjects['+ i + '].grade')[0],
       remarks: formData.getAll('subjects['+ i + '].remarks')[0]
       });
    }

    console.log(subjects)

    fetch("/submit", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ subjects })
    });
})